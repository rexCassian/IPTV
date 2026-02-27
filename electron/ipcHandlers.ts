import { BrowserWindow, ipcMain } from 'electron';
import { MpvManager } from './mpvManager';
import { M3uParser } from './m3uParser';
import { EpgManager } from './epgManager';
import { EpgDatabase } from './epgDatabase';
import { StreamChecker } from './streamChecker';
import { ChannelMatcher } from './channelMatcher';
import { getStore } from './settingsStore';

interface Channel {
    id: string;
    name: string;
    url: string;
    logo: string;
    group: string;
    country: string;
    language: string;
    streamType: string;
}

let mpvManager: MpvManager | null = null;
let m3uParser: M3uParser | null = null;
let epgManager: EpgManager | null = null;
let epgDatabase: EpgDatabase | null = null;
let streamChecker: StreamChecker | null = null;
let channelMatcher: ChannelMatcher | null = null;
let loadedChannels: Channel[] = [];

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
    const store = getStore();

    // Initialize managers
    mpvManager = new MpvManager(mainWindow);
    m3uParser = new M3uParser();
    epgDatabase = new EpgDatabase();
    epgManager = new EpgManager(epgDatabase, mainWindow);
    streamChecker = new StreamChecker();
    channelMatcher = new ChannelMatcher();

    // ─── Player handlers ───
    ipcMain.handle('player:play', async (_event, url: string, streamType: string) => {
        try {
            if (streamType === 'hls' || streamType === 'mpv') {
                await mpvManager!.play(url);
            }
            mainWindow.webContents.send('player:state-changed', { playing: true, url, streamType });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen oynatma hatası';
            mainWindow.webContents.send('player:error', message);
            throw error;
        }
    });

    ipcMain.handle('player:stop', async () => {
        try {
            await mpvManager!.stop();
            mainWindow.webContents.send('player:state-changed', { playing: false, url: null, streamType: null });
        } catch {
            // Ignore stop errors
        }
    });

    ipcMain.handle('player:set-volume', async (_event, volume: number) => {
        try {
            await mpvManager!.setVolume(volume);
            store.set('volume', volume);
        } catch {
            // silent fail
        }
    });

    ipcMain.handle('player:toggle-mute', async () => {
        try {
            const currentMuted = store.get<boolean>('muted');
            const newMuted = !currentMuted;
            await mpvManager!.setMute(newMuted);
            store.set('muted', newMuted);
            return newMuted;
        } catch {
            return false;
        }
    });

    // ─── Channel handlers ───
    ipcMain.handle('channels:load-source', async (_event, source: string) => {
        try {
            const channels = await m3uParser!.parse(source, (progress) => {
                mainWindow.webContents.send('channels:load-progress', progress);
            });
            loadedChannels = channels as Channel[];

            // Send in chunks to avoid IPC bottleneck
            const chunkSize = 500;
            for (let i = 0; i < loadedChannels.length; i += chunkSize) {
                const chunk = loadedChannels.slice(i, i + chunkSize);
                mainWindow.webContents.send('channels:loaded', {
                    channels: chunk,
                    offset: i,
                    total: loadedChannels.length,
                    done: i + chunkSize >= loadedChannels.length,
                });
            }

            // Save source
            const sources = store.get<string[]>('m3uSources');
            if (!sources.includes(source)) {
                store.set('m3uSources', [...sources, source]);
            }

            // Auto-match EPG
            if (epgDatabase!.hasData()) {
                const matches = channelMatcher!.match(loadedChannels, epgDatabase!.getChannels());
                mainWindow.webContents.send('epg:matches-updated', matches);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'M3U yüklenirken hata oluştu';
            throw new Error(message);
        }
    });

    ipcMain.handle('channels:get-all', () => loadedChannels);

    // ─── EPG handlers ───
    ipcMain.handle('epg:get-programs', (_event, channelId: string, date: string) => {
        return epgDatabase!.getPrograms(channelId, date);
    });

    ipcMain.handle('epg:get-current-program', (_event, channelId: string) => {
        return epgDatabase!.getCurrentProgram(channelId);
    });

    ipcMain.handle('epg:force-refresh', async () => {
        const epgUrls = store.get<string[]>('epgUrls');
        if (epgUrls.length > 0) {
            await epgManager!.refresh(epgUrls);
            mainWindow.webContents.send('epg:updated');
        }
    });

    // ─── Settings handlers ───
    ipcMain.handle('settings:get', () => store.store);

    ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
        store.set(key, value as string);
        if (key === 'epgUrls') {
            epgManager!.refresh(value as string[]).then(() => {
                mainWindow.webContents.send('epg:updated');
            });
        }
    });

    // ─── Favorites ───
    ipcMain.handle('favorites:get-all', () => store.get<string[]>('favorites'));

    ipcMain.handle('favorites:toggle', (_event, channelId: string) => {
        const favorites = store.get<string[]>('favorites');
        const index = favorites.indexOf(channelId);
        if (index >= 0) {
            favorites.splice(index, 1);
            store.set('favorites', favorites);
            return false;
        } else {
            favorites.push(channelId);
            store.set('favorites', favorites);
            return true;
        }
    });

    // ─── History ───
    ipcMain.handle('history:get-all', () => store.get('history'));

    ipcMain.handle('history:add', (_event, channelId: string) => {
        const history = store.get<Array<{ channelId: string; timestamp: number }>>('history');
        const filtered = history.filter((h) => h.channelId !== channelId);
        filtered.unshift({ channelId, timestamp: Date.now() });
        store.set('history', filtered.slice(0, 50) as unknown as string);
    });

    // ─── Stream check ───
    ipcMain.handle('stream:check', async (_event, url: string) => {
        return streamChecker!.check(url);
    });

    // Cleanup
    mainWindow.on('closed', () => {
        mpvManager?.destroy();
        epgDatabase?.close();
    });
}
