import { useCallback, useEffect } from 'react';
import { useChannelStore } from '../store/channelStore';
import type { Channel, ChannelsLoadedPayload } from '../types/channel';

export function useChannels() {
    const store = useChannelStore();

    // Listen for channel loading events from main process
    useEffect(() => {
        const unsubLoaded = window.electronAPI.channels.onLoaded((payload) => {
            const data = payload as unknown as ChannelsLoadedPayload;
            if (data.offset === 0) {
                store.setChannels(data.channels as Channel[]);
            } else {
                store.appendChannels(data.channels as Channel[]);
            }

            if (data.done) {
                store.setLoading(false);
            }
        });

        const unsubProgress = window.electronAPI.channels.onLoadProgress((data) => {
            store.setLoadProgress(data);
        });

        // Load favorites
        window.electronAPI.favorites.getAll().then((ids) => {
            store.setFavorites(ids);
        });

        return () => {
            unsubLoaded();
            unsubProgress();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadSource = useCallback(async (source: string) => {
        store.setLoading(true);
        store.setLoadProgress({ loaded: 0, total: 0 });
        try {
            await window.electronAPI.channels.loadSource(source);
        } catch (error) {
            store.setLoading(false);
            throw error;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleFavorite = useCallback(async (channelId: string) => {
        const isFav = await window.electronAPI.favorites.toggle(channelId);
        store.toggleFavorite(channelId);
        return isFav;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const search = useCallback((query: string) => {
        store.setFilter({ search: query });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filterByGroup = useCallback((group: string | null) => {
        store.setFilter({ group });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filterByCountry = useCallback((country: string | null) => {
        store.setFilter({ country });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleFavoritesFilter = useCallback(() => {
        store.setFilter({ favorites: !store.filter.favorites });
    }, [store.filter.favorites]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        channels: store.filteredChannels,
        allChannels: store.channels,
        groups: store.groups,
        countries: store.countries,
        filter: store.filter,
        isLoading: store.isLoading,
        loadProgress: store.loadProgress,
        selectedIndex: store.selectedIndex,
        favorites: store.favorites,

        loadSource,
        toggleFavorite,
        search,
        filterByGroup,
        filterByCountry,
        toggleFavoritesFilter,
        setSelectedIndex: store.setSelectedIndex,
        moveSelection: store.moveSelection,
    };
}
