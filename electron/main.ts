import { app, BrowserWindow, shell, ipcMain, session, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipcHandlers';

// Disable hardware acceleration issues — we handle GPU via mpv
// app.disableHardwareAcceleration();

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

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

    // Intercept headers for IPTV compatibility
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = details.url;
        if (
            !url.startsWith('http://localhost') &&
            !url.startsWith('https://localhost') &&
            !url.startsWith('http://127.0.0.1') &&
            !url.includes('vite')
        ) {
            details.requestHeaders['User-Agent'] = 'VLC/3.0.20 LibVLC/3.0.20';
            details.requestHeaders['Connection'] = 'keep-alive';
            details.requestHeaders['Accept'] = '*/*';
        }
        callback({ requestHeaders: details.requestHeaders });
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

    mainWindow.on('maximize', () => {
        mainWindow?.webContents.send('window:maximized-changed', true);
    });
    mainWindow.on('unmaximize', () => {
        mainWindow?.webContents.send('window:maximized-changed', false);
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
app.whenReady().then(() => {
    createWindow();
    createTray();
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
});

export { mainWindow };
