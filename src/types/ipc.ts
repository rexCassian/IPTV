import type { ElectronAPI } from '../../electron/preload';

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export type { ElectronAPI };

// IPC event payloads
export interface PlayerStatePayload {
    playing: boolean;
    paused?: boolean;
    url: string | null;
    streamType: string | null;
    volume?: number;
    muted?: boolean;
    codec?: string;
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: number;
    buffering?: boolean;
}

export interface ChannelsLoadedPayload {
    channels: unknown[];
    offset: number;
    total: number;
    done: boolean;
}

export interface LoadProgressPayload {
    loaded: number;
    total: number;
}
