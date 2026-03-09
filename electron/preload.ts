import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface ElectronAPI {
    // Window controls
    window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
        onMaximizedChanged: (callback: (maximized: boolean) => void) => () => void;
        toggleFullscreen: () => void;
        setFullscreen: (fullscreen: boolean) => void;
        isFullscreen: () => Promise<boolean>;
        onFullscreenChanged: (callback: (fullscreen: boolean) => void) => () => void;
    };
    // Player
    player: {
        play: (url: string, streamType: string) => Promise<void>;
        stop: () => Promise<void>;
        setVolume: (volume: number) => Promise<void>;
        toggleMute: () => Promise<void>;
        onStateChanged: (callback: (state: unknown) => void) => () => void;
        onError: (callback: (error: string) => void) => () => void;
        onBuffering: (callback: (percent: number) => void) => () => void;
    };
    // Channels
    channels: {
        loadSource: (source: string) => Promise<void>;
        getAll: () => Promise<unknown[]>;
        onLoaded: (callback: (channels: unknown[]) => void) => () => void;
        onLoadProgress: (callback: (data: { loaded: number; total: number }) => void) => () => void;
    };
    // EPG
    epg: {
        getPrograms: (channelId: string, date: string) => Promise<unknown[]>;
        getCurrentProgram: (channelId: string) => Promise<unknown | null>;
        forceRefresh: () => Promise<void>;
        onUpdated: (callback: () => void) => () => void;
        getMeta: () => Promise<{ lastUpdate: number | null; channelsCount: number }>;
        clearDatabase: () => Promise<boolean>;
    };
    // Settings
    settings: {
        get: () => Promise<Record<string, unknown>>;
        set: (key: string, value: unknown) => Promise<void>;
        exportData: () => Promise<boolean>;
        importData: () => Promise<boolean>;
    };
    // Favorites
    favorites: {
        getAll: () => Promise<string[]>;
        toggle: (channelId: string) => Promise<boolean>;
    };
    // History
    history: {
        getAll: () => Promise<unknown[]>;
        add: (channelId: string) => Promise<void>;
    };
    // Stream check
    stream: {
        check: (url: string) => Promise<{ alive: boolean; latency: number }>;
    };
    // Stream proxy
    proxy: {
        getPort: () => Promise<number>;
    };
}

function createEventUnsubscriber(channel: string, handler: (...args: unknown[]) => void): () => void {
    return () => {
        ipcRenderer.removeListener(channel, handler);
    };
}

const electronAPI: ElectronAPI = {
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
        onMaximizedChanged: (callback: (maximized: boolean) => void) => {
            const handler = (_event: IpcRendererEvent, maximized: boolean) => callback(maximized);
            ipcRenderer.on('window:maximized-changed', handler);
            return createEventUnsubscriber('window:maximized-changed', handler as (...args: unknown[]) => void);
        },
        toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
        setFullscreen: (fullscreen: boolean) => ipcRenderer.send('window:set-fullscreen', fullscreen),
        isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
        onFullscreenChanged: (callback: (fullscreen: boolean) => void) => {
            const handler = (_event: IpcRendererEvent, fullscreen: boolean) => callback(fullscreen);
            ipcRenderer.on('window:fullscreen-changed', handler);
            return createEventUnsubscriber('window:fullscreen-changed', handler as (...args: unknown[]) => void);
        },
    },

    player: {
        play: (url: string, streamType: string) => ipcRenderer.invoke('player:play', url, streamType),
        stop: () => ipcRenderer.invoke('player:stop'),
        setVolume: (volume: number) => ipcRenderer.invoke('player:set-volume', volume),
        toggleMute: () => ipcRenderer.invoke('player:toggle-mute'),
        onStateChanged: (callback: (state: unknown) => void) => {
            const handler = (_event: IpcRendererEvent, state: unknown) => callback(state);
            ipcRenderer.on('player:state-changed', handler);
            return createEventUnsubscriber('player:state-changed', handler as (...args: unknown[]) => void);
        },
        onError: (callback: (error: string) => void) => {
            const handler = (_event: IpcRendererEvent, error: string) => callback(error);
            ipcRenderer.on('player:error', handler);
            return createEventUnsubscriber('player:error', handler as (...args: unknown[]) => void);
        },
        onBuffering: (callback: (percent: number) => void) => {
            const handler = (_event: IpcRendererEvent, percent: number) => callback(percent);
            ipcRenderer.on('player:buffering', handler);
            return createEventUnsubscriber('player:buffering', handler as (...args: unknown[]) => void);
        },
    },

    channels: {
        loadSource: (source: string) => ipcRenderer.invoke('channels:load-source', source),
        getAll: () => ipcRenderer.invoke('channels:get-all'),
        onLoaded: (callback: (channels: unknown[]) => void) => {
            const handler = (_event: IpcRendererEvent, channels: unknown[]) => callback(channels);
            ipcRenderer.on('channels:loaded', handler);
            return createEventUnsubscriber('channels:loaded', handler as (...args: unknown[]) => void);
        },
        onLoadProgress: (callback: (data: { loaded: number; total: number }) => void) => {
            const handler = (_event: IpcRendererEvent, data: { loaded: number; total: number }) => callback(data);
            ipcRenderer.on('channels:load-progress', handler);
            return createEventUnsubscriber('channels:load-progress', handler as (...args: unknown[]) => void);
        },
    },

    epg: {
        getPrograms: (channelId: string, date: string) =>
            ipcRenderer.invoke('epg:get-programs', channelId, date),
        getCurrentProgram: (channelId: string) =>
            ipcRenderer.invoke('epg:get-current-program', channelId),
        forceRefresh: () => ipcRenderer.invoke('epg:force-refresh'),
        onUpdated: (callback: () => void) => {
            const handler = () => callback();
            ipcRenderer.on('epg:updated', handler);
            return createEventUnsubscriber('epg:updated', handler as (...args: unknown[]) => void);
        },
        getMeta: () => ipcRenderer.invoke('epg:get-meta'),
        clearDatabase: () => ipcRenderer.invoke('epg:clear-database'),
    },

    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
        exportData: () => ipcRenderer.invoke('settings:export'),
        importData: () => ipcRenderer.invoke('settings:import'),
    },

    favorites: {
        getAll: () => ipcRenderer.invoke('favorites:get-all'),
        toggle: (channelId: string) => ipcRenderer.invoke('favorites:toggle', channelId),
    },

    history: {
        getAll: () => ipcRenderer.invoke('history:get-all'),
        add: (channelId: string) => ipcRenderer.invoke('history:add', channelId),
    },

    stream: {
        check: (url: string) => ipcRenderer.invoke('stream:check', url),
    },

    proxy: {
        getPort: () => ipcRenderer.invoke('proxy:get-port'),
    },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
