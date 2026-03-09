import { create } from 'zustand';

interface Settings {
    m3uSources: string[];
    epgUrls: string[];
    playerSettings: {
        hwdec: string;
        cacheSecs: number;
        bufferSize: string;
        engineOverride: 'auto' | 'mpegts' | 'mp4' | 'hls' | 'mpv';
        timeSkipSecs: number;
        audioDelay: number;
    };
    uiSettings: {
        startupView: 'live' | 'movies' | 'series' | 'favorites';
        theme: 'default' | 'neon-red' | 'matrix-green' | 'midnight-blue';
        reduceAnimations: boolean;
    };
    contentSettings: {
        hideAdult: boolean;
        hiddenCategories: string[];
    };
    volume: number;
    lastChannel: string | null;
}

interface SettingsStore extends Settings {
    loaded: boolean;
    loadSettings: () => Promise<void>;
    setM3uSources: (sources: string[]) => void;
    addM3uSource: (source: string) => Promise<void>;
    removeM3uSource: (source: string) => void;
    setEpgUrls: (urls: string[]) => void;
    addEpgUrl: (url: string) => void;
    removeEpgUrl: (url: string) => void;
    updatePlayerSettings: (settings: Partial<Settings['playerSettings']>) => void;
    updateUiSettings: (settings: Partial<Settings['uiSettings']>) => void;
    updateContentSettings: (settings: Partial<Settings['contentSettings']>) => void;
    setVolume: (volume: number) => void;
    setLastChannel: (channelId: string | null) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
    m3uSources: [],
    epgUrls: [],
    playerSettings: {
        hwdec: 'd3d11va',
        cacheSecs: 8,
        bufferSize: '32MiB',
        engineOverride: 'auto',
        timeSkipSecs: 10,
        audioDelay: 0,
    },
    uiSettings: {
        startupView: 'live',
        theme: 'default',
        reduceAnimations: false,
    },
    contentSettings: {
        hideAdult: false,
        hiddenCategories: [],
    },
    volume: 80,
    lastChannel: null,
    loaded: false,

    loadSettings: async () => {
        try {
            const settings = await window.electronAPI.settings.get();
            set({
                m3uSources: (settings.m3uSources as string[]) || [],
                epgUrls: (settings.epgUrls as string[]) || [],
                playerSettings: (settings.playerSettings as Settings['playerSettings']) || get().playerSettings,
                uiSettings: (settings.uiSettings as Settings['uiSettings']) || get().uiSettings,
                contentSettings: (settings.contentSettings as Settings['contentSettings']) || get().contentSettings,
                volume: (settings.volume as number) || 80,
                lastChannel: (settings.lastChannel as string) || null,
                loaded: true,
            });
        } catch {
            set({ loaded: true });
        }
    },

    setM3uSources: (sources) => {
        set({ m3uSources: sources });
        window.electronAPI.settings.set('m3uSources', sources);
    },

    addM3uSource: async (source) => {
        const current = get().m3uSources;
        if (!current.includes(source)) {
            const updated = [...current, source];
            set({ m3uSources: updated });
            await window.electronAPI.settings.set('m3uSources', updated);
        }
    },

    removeM3uSource: (source) => {
        const updated = get().m3uSources.filter((s) => s !== source);
        set({ m3uSources: updated });
        window.electronAPI.settings.set('m3uSources', updated);
    },

    setEpgUrls: (urls) => {
        set({ epgUrls: urls });
        window.electronAPI.settings.set('epgUrls', urls);
    },

    addEpgUrl: (url) => {
        const current = get().epgUrls;
        if (!current.includes(url)) {
            const updated = [...current, url];
            set({ epgUrls: updated });
            window.electronAPI.settings.set('epgUrls', updated);
        }
    },

    removeEpgUrl: (url) => {
        const updated = get().epgUrls.filter((u) => u !== url);
        set({ epgUrls: updated });
        window.electronAPI.settings.set('epgUrls', updated);
    },

    updatePlayerSettings: (settings) => {
        const updated = { ...get().playerSettings, ...settings };
        set({ playerSettings: updated });
        window.electronAPI.settings.set('playerSettings', updated);
    },

    updateUiSettings: (settings) => {
        const updated = { ...get().uiSettings, ...settings };
        set({ uiSettings: updated });
        window.electronAPI.settings.set('uiSettings', updated);
    },

    updateContentSettings: (settings) => {
        const updated = { ...get().contentSettings, ...settings };
        set({ contentSettings: updated });
        window.electronAPI.settings.set('contentSettings', updated);
    },

    setVolume: (volume) => {
        set({ volume });
        window.electronAPI.settings.set('volume', volume);
    },

    setLastChannel: (channelId) => {
        set({ lastChannel: channelId });
        window.electronAPI.settings.set('lastChannel', channelId);
    },
}));
