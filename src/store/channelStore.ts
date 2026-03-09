import { create } from 'zustand';
import Fuse from 'fuse.js';
import type { Channel, ChannelFilter } from '../types/channel';
import type { MainTab } from '../types/content';
import { groupSeriesByShow, parseSeriesName } from '../utils/seriesParser';
import type { SeriesGroup } from '../types/content';
import { useSettingsStore } from './settingsStore';

interface ChannelStore {
    // ─── Base ───────────────────────────────────────────
    channels: Channel[];
    safeChannels: Channel[];
    filteredChannels: Channel[];
    groups: string[];
    allGroups: string[];
    countries: string[];
    filter: ChannelFilter;
    isLoading: boolean;
    loadProgress: { loaded: number; total: number };
    selectedIndex: number;
    favorites: Set<string>;
    fuseInstance: Fuse<Channel> | null;

    // ─── 3-Tab system ───────────────────────────────────
    activeMainTab: MainTab;
    liveChannels: Channel[];
    movieChannels: Channel[];
    seriesChannels: Channel[];
    seriesGroups: SeriesGroup[];
    liveCount: number;
    movieCount: number;
    seriesCount: number;

    // ─── Actions ─────────────────────────────────────────
    setChannels: (channels: Channel[]) => void;
    appendChannels: (channels: Channel[]) => void;
    setFilter: (filter: Partial<ChannelFilter>) => void;
    setLoading: (loading: boolean) => void;
    setLoadProgress: (progress: { loaded: number; total: number }) => void;
    setSelectedIndex: (index: number) => void;
    moveSelection: (delta: number) => void;
    setFavorites: (ids: string[]) => void;
    toggleFavorite: (id: string) => void;
    toggleFavoriteAsync: (id: string) => Promise<boolean>;
    applyFilters: () => void;
    recomputeSafeChannels: () => void;
    setActiveMainTab: (tab: MainTab) => void;
}

function buildFuse(channels: Channel[]): Fuse<Channel> {
    return new Fuse(channels, {
        keys: ['name', 'group', 'country'],
        threshold: 0.3,
        includeScore: false,
    });
}

function extractGroups(channels: Channel[]): string[] {
    const set = new Set<string>();
    for (const ch of channels) if (ch.group) set.add(ch.group);
    return Array.from(set).sort();
}

function extractCountries(channels: Channel[]): string[] {
    const set = new Set<string>();
    for (const ch of channels) if (ch.country) set.add(ch.country);
    return Array.from(set).sort();
}

function splitByContentType(channels: Channel[]) {
    const live: Channel[] = [];
    const movie: Channel[] = [];
    const series: Channel[] = [];
    for (const ch of channels) {
        const ct = (ch as Channel & { contentType?: string }).contentType;
        if (ct === 'movie') movie.push(ch);
        else if (ct === 'series') series.push(ch);
        else live.push(ch);
    }
    return { live, movie, series };
}

export const useChannelStore = create<ChannelStore>((set: any, get: any) => ({
    // base
    channels: [], safeChannels: [], filteredChannels: [], groups: [], allGroups: [], countries: [],
    filter: { search: '', group: null, country: null, favorites: false },
    isLoading: false, loadProgress: { loaded: 0, total: 0 },
    selectedIndex: 0, favorites: new Set<string>(), fuseInstance: null,

    // 3-tab
    activeMainTab: 'live',
    liveChannels: [], movieChannels: [], seriesChannels: [],
    seriesGroups: [],
    liveCount: 0, movieCount: 0, seriesCount: 0,

    setChannels: (channels: Channel[]) => {
        set({ channels });
        get().recomputeSafeChannels();
    },

    appendChannels: (newChannels: Channel[]) => {
        const all = [...get().channels, ...newChannels];
        set({ channels: all });
        get().recomputeSafeChannels();
    },

    setFilter: (partial: Partial<ChannelFilter>) => {
        set((state: ChannelStore) => ({ filter: { ...state.filter, ...partial }, selectedIndex: 0 }));
        get().applyFilters();
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setLoadProgress: (progress: { loaded: number; total: number }) => set({ loadProgress: progress }),
    setSelectedIndex: (index: number) => set({ selectedIndex: index }),

    moveSelection: (delta: number) => {
        const { filteredChannels, selectedIndex } = get();
        const newIndex = Math.max(0, Math.min(filteredChannels.length - 1, selectedIndex + delta));
        set({ selectedIndex: newIndex });
    },

    setFavorites: (ids: string[]) => set({ favorites: new Set(ids) }),

    toggleFavorite: (id: string) => {
        set((state: ChannelStore) => {
            const next = new Set(state.favorites);
            next.has(id) ? next.delete(id) : next.add(id);
            return { favorites: next };
        });
        get().applyFilters();
    },

    toggleFavoriteAsync: async (id: string) => {
        // Assume electron API is available asynchronously
        const isFav = await window.electronAPI.favorites.toggle(id);
        get().toggleFavorite(id);
        return isFav;
    },

    applyFilters: () => {
        const { filter, fuseInstance, favorites, activeMainTab,
            liveChannels, movieChannels, seriesChannels } = get();

        // Source depends on active tab
        let source: Channel[] =
            activeMainTab === 'movie' ? movieChannels :
                activeMainTab === 'series' ? seriesChannels :
                    liveChannels;

        // Search
        if (filter.search && fuseInstance) {
            const rawResults = fuseInstance.search(filter.search).map((r: { item: Channel }) => r.item);
            source = rawResults.filter((ch: Channel) => {
                const ct = (ch as any).contentType;
                if (activeMainTab === 'movie') return ct === 'movie';
                if (activeMainTab === 'series') return ct === 'series';
                return ct !== 'movie' && ct !== 'series';
            });
        }

        if (filter.group) source = source.filter((ch: Channel) => ch.group === filter.group);
        if (filter.country) source = source.filter((ch: Channel) => ch.country === filter.country);
        if (filter.favorites) {
            if (activeMainTab === 'series') {
                // If it's a series, check if the entire series is favorited
                source = source.filter((ch: Channel) => {
                    const info = parseSeriesName(ch.name);
                    const key = info ? info.showName : ch.name;
                    return favorites.has(`series_${key}`);
                });
            } else {
                source = source.filter((ch: Channel) => favorites.has(ch.id));
            }
        }

        set({ filteredChannels: source });
    },

    recomputeSafeChannels: () => {
        const { channels } = get();
        const { contentSettings } = useSettingsStore.getState();

        let safeChannels = channels;

        if (contentSettings.hiddenCategories.length > 0) {
            safeChannels = safeChannels.filter((ch: Channel) => !contentSettings.hiddenCategories.includes(ch.group || ''));
        }

        if (contentSettings.hideAdult) {
            const adultRegex = /(adult|xxx|18\+|porn|nsfw)/i;
            safeChannels = safeChannels.filter((ch: Channel) => {
                if (ch.group && adultRegex.test(ch.group)) return false;
                if (ch.name && adultRegex.test(ch.name)) return false;
                return true;
            });
        }

        const fuse = buildFuse(safeChannels);
        const { live, movie, series } = splitByContentType(safeChannels);
        const sg = groupSeriesByShow(series as any);

        set({
            safeChannels,
            fuseInstance: fuse,
            groups: extractGroups(safeChannels),
            allGroups: extractGroups(channels),
            countries: extractCountries(safeChannels),
            selectedIndex: 0,
            liveChannels: live,
            movieChannels: movie,
            seriesChannels: series,
            seriesGroups: sg,
            liveCount: live.length,
            movieCount: movie.length,
            seriesCount: series.length,
        });

        get().applyFilters();
    },

    setActiveMainTab: (tab: MainTab) => {
        set({ activeMainTab: tab, filter: { search: '', group: null, country: null, favorites: false }, selectedIndex: 0 });
        get().applyFilters();
    },
}));

// Cross-store subscription: Recompute safe channels automatically when 
// the user modifies the hidden categories or adult filter settings.
useSettingsStore.subscribe((state, prevState) => {
    if (state.contentSettings !== prevState.contentSettings) {
        useChannelStore.getState().recomputeSafeChannels();
    }
});
