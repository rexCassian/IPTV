import React, { useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TitleBar } from './components/Common/TitleBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { PlayerContainer } from './components/Player/PlayerContainer';
import { SettingsModal } from './components/Settings/SettingsModal';
import { EPGGuide } from './components/EPG/EPGGuide';
import { useUiStore } from './store/uiStore';
import { useSettingsStore } from './store/settingsStore';
import { usePlayerStore } from './store/playerStore';
import { useKeyboard } from './hooks/useKeyboard';
import { useChannels } from './hooks/useChannels';
import { playChannelByIndex } from './utils/playerActions';

export default function App() {
    const { activeModal, isFullscreen } = useUiStore();
    const { loadSettings, m3uSources } = useSettingsStore();
    const { setVolume: setPlayerVolume, toggleMute: playerToggleMute } = usePlayerStore();
    const { loadSource } = useChannels();

    // Load settings on startup
    useEffect(() => {
        loadSettings();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync native fullscreen state with UI store (Electron IPC + browser API)
    useEffect(() => {
        let unsubElectron: (() => void) | undefined;
        if (window.electronAPI?.window?.onFullscreenChanged) {
            unsubElectron = window.electronAPI.window.onFullscreenChanged((fs: boolean) => {
                if (useUiStore.getState().isFullscreen !== fs) {
                    useUiStore.setState({ isFullscreen: fs });
                }
            });
        }

        const handleBrowserFs = () => {
            const isFs = document.fullscreenElement != null;
            if (useUiStore.getState().isFullscreen !== isFs) {
                useUiStore.setState({ isFullscreen: isFs });
            }
        };
        document.addEventListener('fullscreenchange', handleBrowserFs);

        return () => {
            if (unsubElectron) unsubElectron();
            document.removeEventListener('fullscreenchange', handleBrowserFs);
        };
    }, []);

    // Auto-load first M3U source on startup
    useEffect(() => {
        if (m3uSources.length > 0) {
            loadSource(m3uSources[0]);
        }
    }, [m3uSources[0]]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleToggleFavorite = useCallback(() => {
        // handled in ChannelItem directly
    }, []);

    const handleVolumeChange = useCallback(
        (delta: number) => {
            const current = usePlayerStore.getState().volume;
            const newVol = Math.max(0, Math.min(100, current + delta));
            setPlayerVolume(newVol);
            window.electronAPI.player.setVolume(newVol);
        },
        [setPlayerVolume],
    );

    const handleToggleMute = useCallback(() => {
        playerToggleMute();
        window.electronAPI.player.toggleMute();
    }, [playerToggleMute]);

    const handleRefreshEpg = useCallback(() => {
        window.electronAPI.epg.forceRefresh();
    }, []);

    // Register keyboard shortcuts
    useKeyboard({
        onPlayChannel: playChannelByIndex,   // Enter key plays selected channel
        onToggleFavorite: handleToggleFavorite,
        onVolumeChange: handleVolumeChange,
        onToggleMute: handleToggleMute,
        onRefreshEpg: handleRefreshEpg,
    });

    return (
        <div className="flex flex-col h-screen w-full bg-dark-950 text-white overflow-hidden">
            {/* Title Bar */}
            {!isFullscreen && <TitleBar />}

            {/* Main Layout */}
            <div className="flex flex-1 w-full overflow-hidden relative">
                {/* Sidebar */}
                {!isFullscreen && <Sidebar />}

                {/* Player */}
                <PlayerContainer />
            </div>

            {/* Modals */}
            <AnimatePresence>
                {activeModal === 'settings' && <SettingsModal />}
                {activeModal === 'epgGuide' && <EPGGuide />}
            </AnimatePresence>
        </div>
    );
}
