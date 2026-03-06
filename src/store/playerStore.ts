import { create } from 'zustand';
import type { Channel } from '../types/channel';
import type { PlayerEngine, PlayerStatus, PlayerState } from '../types/player';

interface PlayerStore extends PlayerState {
    currentChannel: Channel | null;
    setCurrentChannel: (channel: Channel | null) => void;
    setEngine: (engine: PlayerEngine) => void;
    setStatus: (status: PlayerStatus) => void;
    setUrl: (url: string | null) => void;
    setVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;
    toggleMute: () => void;
    setError: (message: string | null) => void;
    setBuffering: (percent: number) => void;
    setStreamInfo: (info: { codec?: string; width?: number; height?: number; fps?: number; bitrate?: number }) => void;
    reset: () => void;
}

const initialState: PlayerState = {
    engine: 'none',
    status: 'idle',
    url: null,
    volume: 80,
    muted: false,
    errorMessage: null,
    bufferPercent: 0,
    codec: '',
    width: 0,
    height: 0,
    fps: 0,
    bitrate: 0,
};

export const usePlayerStore = create<PlayerStore>((set) => ({
    ...initialState,
    currentChannel: null,

    setCurrentChannel: (channel) => set({ currentChannel: channel }),

    setEngine: (engine) => set({ engine }),

    setStatus: (status) => set((state) => ({
        status,
        // Hata olmayan durumlarda errorMessage'ı temizle
        // Ama 'error' status'unda mevcut errorMessage'a dokunma
        errorMessage: status !== 'error' ? null : state.errorMessage,
    })),

    setUrl: (url) => set({ url }),

    setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),

    setMuted: (muted) => set({ muted }),

    toggleMute: () => set((state) => ({ muted: !state.muted })),

    setError: (message) => set((state) => ({
        errorMessage: message,
        // setError çağrılınca status'a DOKUNMA
        // Status zaten Mp4Player/MpegtsPlayer tarafından yönetiliyor
        // Sadece mesaj yoksa ve status error'sa idle'a çek
        status: !message && state.status === 'error' ? 'idle' : state.status,
    })),

    setBuffering: (percent) => set({ bufferPercent: percent, status: percent < 100 ? 'buffering' : 'playing' }),

    setStreamInfo: (info) =>
        set((state) => ({
            codec: info.codec ?? state.codec,
            width: info.width ?? state.width,
            height: info.height ?? state.height,
            fps: info.fps ?? state.fps,
            bitrate: info.bitrate ?? state.bitrate,
        })),

    reset: () => set({ ...initialState, currentChannel: null }),
}));
