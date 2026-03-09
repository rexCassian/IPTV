import { create } from 'zustand';

type ModalType = 'settings' | 'epgGuide' | 'channelMapper' | null;

interface UiStore {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    activeModal: ModalType;
    isFullscreen: boolean;
    isWindowMaximized: boolean;
    showStreamInfo: boolean;
    isSearchActive: boolean;
    theme: 'dark';

    setSidebarWidth: (width: number) => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    openModal: (modal: ModalType) => void;
    closeModal: () => void;
    setFullscreen: (fullscreen: boolean) => void;
    toggleFullscreen: () => void;
    setWindowMaximized: (maximized: boolean) => void;
    toggleStreamInfo: () => void;
    setSearchActive: (active: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
    sidebarWidth: 340,
    sidebarCollapsed: false,
    activeModal: null,
    isFullscreen: false,
    isWindowMaximized: false,
    showStreamInfo: false,
    isSearchActive: false,
    theme: 'dark',

    setSidebarWidth: (width) => set({ sidebarWidth: Math.max(280, Math.min(500, width)) }),

    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    setSidebarCollapsed: (c) => set({ sidebarCollapsed: c }),

    openModal: (modal) => set({ activeModal: modal }),

    closeModal: () => set({ activeModal: null }),

    setFullscreen: async (fullscreen) => {
        if (useUiStore.getState().isFullscreen === fullscreen) return;
        set({ isFullscreen: fullscreen });

        if (fullscreen) {
            try {
                if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                if (window.electronAPI?.window?.setFullscreen) {
                    window.electronAPI.window.setFullscreen(true);
                }
            }
        } else {
            try {
                if (document.fullscreenElement && document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (window.electronAPI?.window?.setFullscreen) {
                    window.electronAPI.window.setFullscreen(false);
                }
            } catch (err) {
                if (window.electronAPI?.window?.setFullscreen) {
                    window.electronAPI.window.setFullscreen(false);
                }
            }
        }
    },

    toggleFullscreen: () => {
        const isFS = useUiStore.getState().isFullscreen;
        useUiStore.getState().setFullscreen(!isFS);
    },

    setWindowMaximized: (maximized) => set({ isWindowMaximized: maximized }),

    toggleStreamInfo: () => set((s) => ({ showStreamInfo: !s.showStreamInfo })),

    setSearchActive: (a) => set({ isSearchActive: a }),
}));
