import { app, BrowserWindow, shell, ipcMain, session, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipcHandlers';
import { StreamProxy } from './streamProxy';

// Disable hardware acceleration issues — we handle GPU via mpv
// app.disableHardwareAcceleration();

// Enable AudioTrackList so HTML5 <video> exposes multiple audio tracks for VOD content
app.commandLine.appendSwitch('enable-features', 'AudioTrackList');

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const streamProxy = new StreamProxy();

const WINDOW_STATE_DEFAULTS = {
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
};

function createWindow(): void {
    mainWindow = new BrowserWindow({
        ...WINDOW_STATE_DEFAULTS,
        backgroundColor: '#0a0d1a',
        title: 'Coriolis IPTV',
        icon: path.join(__dirname, '../public/icon.ico'),
        frame: false,
        titleBarStyle: 'hidden',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // need false for preload script with IPC
            webSecurity: false, // CORS bypass for IPTV streams
        },
        autoHideMenuBar: true,
    });

    // Intercept headers for IPTV compatibility (Firefox UA matching M3U user-agent)
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = details.url;
        if (
            !url.startsWith('http://localhost') &&
            !url.startsWith('https://localhost') &&
            !url.startsWith('http://127.0.0.1') &&
            !url.includes('vite')
        ) {
            details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0';
            details.requestHeaders['Connection'] = 'keep-alive';
            details.requestHeaders['Accept'] = '*/*';
            // Add Referer/Origin from target URL for IPTV auth
            try {
                const parsed = new URL(url);
                const origin = `${parsed.protocol}//${parsed.host}`;
                details.requestHeaders['Referer'] = origin + '/';
                details.requestHeaders['Origin'] = origin;
            } catch {
                // ignore parse errors
            }
        }
        callback({ requestHeaders: details.requestHeaders });
    });

    // CSP — Google Fonts ve media kaynaklarına izin ver
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                    "worker-src 'self' blob:; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' https://fonts.gstatic.com data:; " +
                    "media-src 'self' blob: http: https:; " +
                    "img-src 'self' data: blob: http: https:; " +
                    "connect-src 'self' ws: wss: http: https:;"
                ],
            },
        });
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Load the app
    const isDev = !app.isPackaged;
    if (isDev) {
        const loadDevUrl = (): void => {
            mainWindow?.loadURL('http://localhost:5173').catch(() => {
                setTimeout(loadDevUrl, 1000);
            });
        };
        loadDevUrl();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        // Auto-open DevTools in dev mode
        if (isDev) {
            mainWindow?.webContents.openDevTools();
        }
    });

    // Global keyboard shortcuts (F12, F11, Escape)
    mainWindow.webContents.on('before-input-event', (_event, input) => {
        if (input.type === 'keyDown') {
            if (input.key === 'F12') {
                mainWindow?.webContents.toggleDevTools();
            } else if (input.key === 'F11') {
                const isFS = mainWindow?.isFullScreen();
                mainWindow?.setFullScreen(!isFS);
                _event.preventDefault();
            } else if (input.key === 'Escape') {
                if (mainWindow?.isFullScreen()) {
                    mainWindow.setFullScreen(false);
                    _event.preventDefault();
                }
            }
        }
    });

    // Window state IPC handlers
    ipcMain.on('window:minimize', () => mainWindow?.minimize());
    ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.on('window:close', () => mainWindow?.close());
    ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

    // Fullscreen IPC handlers
    ipcMain.on('window:toggle-fullscreen', () => {
        if (mainWindow) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });
    ipcMain.on('window:set-fullscreen', (_event, fullscreen: boolean) => {
        mainWindow?.setFullScreen(fullscreen);
    });
    ipcMain.handle('window:is-fullscreen', () => mainWindow?.isFullScreen() ?? false);

    mainWindow.on('maximize', () => {
        mainWindow?.webContents.send('window:maximized-changed', true);
    });
    mainWindow.on('unmaximize', () => {
        mainWindow?.webContents.send('window:maximized-changed', false);
    });

    mainWindow.on('enter-full-screen', () => {
        mainWindow?.webContents.send('window:fullscreen-changed', true);
    });
    mainWindow.on('leave-full-screen', () => {
        mainWindow?.webContents.send('window:fullscreen-changed', false);
    });

    // Also listen to HTML Native Fullscreen events (when user double-clicks video element etc.)
    mainWindow.on('enter-html-full-screen', () => {
        mainWindow?.webContents.send('window:fullscreen-changed', true);
    });
    mainWindow.on('leave-html-full-screen', () => {
        mainWindow?.webContents.send('window:fullscreen-changed', false);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Register all IPC handlers
    registerIpcHandlers(mainWindow);
}

function createTray(): void {
    const iconPath = path.join(__dirname, '../public/icon.ico');
    try {
        const icon = nativeImage.createFromPath(iconPath);
        tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    } catch {
        tray = new Tray(nativeImage.createEmpty());
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Göster',
            click: () => mainWindow?.show(),
        },
        {
            label: 'Çıkış',
            click: () => {
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Coriolis IPTV');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow?.show());
}

// App lifecycle
app.whenReady().then(async () => {
    // Start stream proxy first
    const proxyPort = await streamProxy.start();

    createWindow();
    createTray();

    // Expose proxy port to renderer
    ipcMain.handle('proxy:get-port', () => proxyPort);
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// Cleanup on quit
app.on('before-quit', () => {
    tray?.destroy();
    streamProxy.stop();
});

export { mainWindow };
