import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useChannelStore } from '../store/channelStore';
import { useUiStore } from '../store/uiStore';

interface KeyboardActions {
    onPlayChannel: (index: number) => void;
    onToggleFavorite: () => void;
    onVolumeChange: (delta: number) => void;
    onToggleMute: () => void;
    onRefreshEpg: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
    const ui = useUiStore();
    const channelStore = useChannelStore();

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Don't handle shortcuts when typing in inputs
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                // Only allow Escape to blur
                if (e.key === 'Escape') {
                    target.blur();
                    e.preventDefault();
                }
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    channelStore.moveSelection(-1);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    channelStore.moveSelection(1);
                    break;

                case 'Enter':
                    e.preventDefault();
                    actions.onPlayChannel(channelStore.selectedIndex);
                    break;

                case 'f':
                case 'F':
                case 'k':
                case 'K':
                    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.altKey) {
                        e.preventDefault();
                        ui.toggleFullscreen();
                    } else if (e.ctrlKey) {
                        e.preventDefault();
                        ui.setSearchActive(true);
                    }
                    break;

                case 'm':
                case 'M':
                    if (!e.ctrlKey) {
                        e.preventDefault();
                        actions.onToggleMute();
                    }
                    break;

                case '+':
                case '=':
                    e.preventDefault();
                    actions.onVolumeChange(5);
                    break;

                case '-':
                case '_':
                    e.preventDefault();
                    actions.onVolumeChange(-5);
                    break;

                case 'Escape':
                    e.preventDefault();
                    if (ui.isSearchActive) {
                        ui.setSearchActive(false);
                    } else if (ui.isFullscreen) {
                        ui.setFullscreen(false);
                    } else if (ui.activeModal) {
                        ui.closeModal();
                    }
                    break;

                case ',':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        ui.openModal('settings');
                    }
                    break;

                case 'e':
                case 'E':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        ui.openModal('epgGuide');
                    }
                    break;

                case 'F5':
                    e.preventDefault();
                    actions.onRefreshEpg();
                    break;

                case 'd':
                case 'D':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        actions.onToggleFavorite();
                    }
                    break;

                case 'PageUp':
                    e.preventDefault();
                    channelStore.moveSelection(-10);
                    break;

                case 'PageDown':
                    e.preventDefault();
                    channelStore.moveSelection(10);
                    break;
            }
        },
        [actions, ui, channelStore],
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
