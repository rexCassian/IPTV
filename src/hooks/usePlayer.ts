import { useCallback, useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Channel } from '../types/channel';

function detectStreamType(url: string): 'hls' | 'mpegts' {
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8')) return 'hls';
    if (lower.endsWith('.ts') || lower.includes(':8080/') || lower.includes(':25461/')) return 'mpegts';
    if (lower.includes('/live/') && !lower.includes('.m3u8')) return 'mpegts';
    return 'hls';
}

export function usePlayer() {
    const store = usePlayerStore();
    const settings = useSettingsStore();
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Listen for player events from main process
    useEffect(() => {
        const unsubState = window.electronAPI.player.onStateChanged((state) => {
            const s = state as Record<string, unknown>;
            if (s.playing !== undefined) {
                store.setStatus(s.playing ? 'playing' : 'idle');
            }
            if (s.codec || s.width || s.height || s.fps || s.bitrate) {
                store.setStreamInfo({
                    codec: s.codec as string,
                    width: s.width as number,
                    height: s.height as number,
                    fps: s.fps as number,
                    bitrate: s.bitrate as number,
                });
            }
        });

        const unsubError = window.electronAPI.player.onError((error) => {
            store.setError(error);
        });

        const unsubBuffer = window.electronAPI.player.onBuffering((percent) => {
            store.setBuffering(percent);
        });

        return () => {
            unsubState();
            unsubError();
            unsubBuffer();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const playChannel = useCallback(async (channel: Channel) => {
        // Set UI state immediately
        store.setCurrentChannel(channel);
        store.setStatus('loading');
        store.setError(null);

        const streamType = detectStreamType(channel.url);
        store.setEngine(streamType === 'hls' ? 'mpv' : 'mpegts');

        try {
            if (streamType === 'hls') {
                // Stop mpegts if playing
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.src = '';
                }
                await window.electronAPI.player.play(channel.url, 'hls');
            } else {
                // Stop mpv if playing
                await window.electronAPI.player.stop();
                store.setEngine('mpegts');
                store.setUrl(channel.url);
                store.setStatus('loading');
                // mpegts.js will be initialized by MpegtsPlayer component
            }

            // Track in history
            window.electronAPI.history.add(channel.id);
            settings.setLastChannel(channel.id);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Kanal açılamadı';
            store.setError(msg);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const stop = useCallback(async () => {
        try {
            await window.electronAPI.player.stop();
        } catch {
            // Ignore
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = '';
        }
        store.reset();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const setVolume = useCallback(async (volume: number) => {
        store.setVolume(volume);
        settings.setVolume(volume);
        await window.electronAPI.player.setVolume(volume);
        if (videoRef.current) {
            videoRef.current.volume = volume / 100;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleMute = useCallback(async () => {
        store.toggleMute();
        await window.electronAPI.player.toggleMute();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const retry = useCallback(() => {
        const channel = store.currentChannel;
        if (channel) {
            playChannel(channel);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        ...store,
        videoRef,
        playChannel,
        stop,
        setVolume,
        toggleMute,
        retry,
    };
}
