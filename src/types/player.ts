export type PlayerEngine = 'mpv' | 'mpegts' | 'mp4' | 'none';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

export interface PlayerState {
    engine: PlayerEngine;
    status: PlayerStatus;
    url: string | null;
    volume: number;
    muted: boolean;
    errorMessage: string | null;
    bufferPercent: number;
    codec: string;
    width: number;
    height: number;
    fps: number;
    bitrate: number;
}

export interface PlayerSettings {
    hwdec: string;
    cacheSecs: number;
    bufferSize: string;
}

export const DEFAULT_PLAYER_STATE: PlayerState = {
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
