import { create } from 'zustand';
import Fuse from 'fuse.js';
import type { Channel, ChannelFilter } from '../types/channel';
import type { MainTab } from '../types/content';
import { groupSeriesByShow, parseSeriesName } from '../utils/seriesParser';
import type { SeriesGroup } from '../types/content';

interface ChannelStore {
    // ─── Base ───────────────────────────────────────────
    channels: Channel[];
    filteredChannels: Channel[];
    groups: string[];
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

export const useChannelStore = create<ChannelStore>((set, get) => ({
    // base
    channels: [], filteredChannels: [], groups: [], countries: [],
    filter: { search: '', group: null, country: null, favorites: false },
    isLoading: false, loadProgress: { loaded: 0, total: 0 },
    selectedIndex: 0, favorites: new Set<string>(), fuseInstance: null,

    // 3-tab
    activeMainTab: 'live',
    liveChannels: [], movieChannels: [], seriesChannels: [],
    seriesGroups: [],
    liveCount: 0, movieCount: 0, seriesCount: 0,

    setChannels: (channels) => {
        const fuse = buildFuse(channels);
        const { live, movie, series } = splitByContentType(channels);
        const sg = groupSeriesByShow(series as any);
        set({
            channels, fuseInstance: fuse,
            groups: extractGroups(channels),
            countries: extractCountries(channels),
            selectedIndex: 0,
            liveChannels: live, movieChannels: movie, seriesChannels: series,
            seriesGroups: sg,
            liveCount: live.length, movieCount: movie.length, seriesCount: series.length,
        });
        get().applyFilters();
    },

    appendChannels: (newChannels) => {
        const all = [...get().channels, ...newChannels];
        const fuse = buildFuse(all);
        const { live, movie, series } = splitByContentType(all);
        const sg = groupSeriesByShow(series as any);
        set({
            channels: all, fuseInstance: fuse,
            groups: extractGroups(all), countries: extractCountries(all),
            liveChannels: live, movieChannels: movie, seriesChannels: series,
            seriesGroups: sg,
            liveCount: live.length, movieCount: movie.length, seriesCount: series.length,
        });
        get().applyFilters();
    },

    setFilter: (partial) => {
        set((state) => ({ filter: { ...state.filter, ...partial }, selectedIndex: 0 }));
        get().applyFilters();
    },

    setLoading: (loading) => set({ isLoading: loading }),
    setLoadProgress: (progress) => set({ loadProgress: progress }),
    setSelectedIndex: (index) => set({ selectedIndex: index }),

    moveSelection: (delta) => {
        const { filteredChannels, selectedIndex } = get();
        const newIndex = Math.max(0, Math.min(filteredChannels.length - 1, selectedIndex + delta));
        set({ selectedIndex: newIndex });
    },

    setFavorites: (ids) => set({ favorites: new Set(ids) }),

    toggleFavorite: (id) => {
        set((state) => {
            const next = new Set(state.favorites);
            next.has(id) ? next.delete(id) : next.add(id);
            return { favorites: next };
        });
        get().applyFilters();
    },

    toggleFavoriteAsync: async (id) => {
        // Assume electron API is available asynchronously
        const isFav = await window.electronAPI.favorites.toggle(id);
        get().toggleFavorite(id);
        return isFav;
    },

    applyFilters: () => {
        const { channels, filter, fuseInstance, favorites, activeMainTab,
            liveChannels, movieChannels, seriesChannels } = get();

        // Source depends on active tab
        let source: Channel[] =
            activeMainTab === 'movie' ? movieChannels :
                activeMainTab === 'series' ? seriesChannels :
                    liveChannels;

        // Search
        if (filter.search && fuseInstance) {
            const rawResults = fuseInstance.search(filter.search).map((r) => r.item);
            source = rawResults.filter((ch) => {
                const ct = (ch as any).contentType;
                if (activeMainTab === 'movie') return ct === 'movie';
                if (activeMainTab === 'series') return ct === 'series';
                return ct !== 'movie' && ct !== 'series';
            });
        }

        if (filter.group) source = source.filter((ch) => ch.group === filter.group);
        if (filter.country) source = source.filter((ch) => ch.country === filter.country);
        if (filter.favorites) {
            if (activeMainTab === 'series') {
                // If it's a series, check if the entire series is favorited
                source = source.filter((ch) => {
                    const info = parseSeriesName(ch.name);
                    const key = info ? info.showName : ch.name;
                    return favorites.has(`series_${key}`);
                });
            } else {
                source = source.filter((ch) => favorites.has(ch.id));
            }
        }

        set({ filteredChannels: source });
    },

    setActiveMainTab: (tab) => {
        set({ activeMainTab: tab, filter: { search: '', group: null, country: null, favorites: false }, selectedIndex: 0 });
        get().applyFilters();
    },
}));
