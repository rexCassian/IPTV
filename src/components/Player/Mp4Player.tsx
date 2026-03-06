import React, { memo, useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { parseXtreamVodUrl, fetchXtreamSubtitles } from '../../utils/xtreamSubtitles';

// ─── Track info interfaces ───
export interface AudioTrackInfo {
    id: string;
    label: string;
    language: string;
    enabled: boolean;
}

export interface SubtitleTrackInfo {
    id: string;
    label: string;
    language: string;
    mode: 'disabled' | 'hidden' | 'showing';
}

export interface Mp4PlayerHandle {
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    seekTo: (time: number) => void;
    skip: (delta: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getAudioTracks: () => AudioTrackInfo[];
    getSubtitleTracks: () => SubtitleTrackInfo[];
    setAudioTrack: (id: string) => void;
    setSubtitleTrack: (id: string | null) => void;
}

interface Mp4PlayerProps {
    url: string;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onTracksDetected?: (audioTracks: AudioTrackInfo[], subtitleTracks: SubtitleTrackInfo[]) => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export const Mp4Player = memo(forwardRef<Mp4PlayerHandle, Mp4PlayerProps>(
    function Mp4Player({ url, onProgressUpdate, onTracksDetected }, ref) {
        const videoRef = useRef<HTMLVideoElement>(null);
        const { setStatus, setError, setStreamInfo, volume, muted, setVolume, setMuted } = usePlayerStore();
        const [retryCount, setRetryCount] = useState(0);
        const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
        const trackTimerRef = useRef<ReturnType<typeof setTimeout>>();

        // ─── Helper: scan video element for audio & subtitle tracks ───
        const scanAndReportTracks = useCallback((video: HTMLVideoElement) => {
            const audioTracks: AudioTrackInfo[] = [];
            if ((video as any).audioTracks) {
                const at = (video as any).audioTracks;
                for (let i = 0; i < at.length; i++) {
                    const t = at[i];
                    audioTracks.push({
                        id: t.id || String(i),
                        label: t.label || `Ses ${i + 1}`,
                        language: t.language || 'und',
                        enabled: t.enabled,
                    });
                }
            }

            const subtitleTracks: SubtitleTrackInfo[] = [];
            if (video.textTracks) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    const t = video.textTracks[i];
                    if (t.kind === 'subtitles' || t.kind === 'captions') {
                        subtitleTracks.push({
                            id: t.id || String(i),
                            label: t.label || `Altyazı ${i + 1}`,
                            language: t.language || 'und',
                            mode: t.mode as 'disabled' | 'hidden' | 'showing',
                        });
                    }
                }
            }

            if (audioTracks.length > 1 || subtitleTracks.length > 0) {
                onTracksDetected?.(audioTracks, subtitleTracks);
            }
        }, [onTracksDetected]);

        // ─── Expose handle to parent ───
        useImperativeHandle(ref, () => ({
            play: () => {
                videoRef.current?.play().catch(() => { });
            },
            pause: () => {
                videoRef.current?.pause();
            },
            togglePlay: () => {
                const video = videoRef.current;
                if (!video) return;
                if (video.paused) {
                    video.play().catch(() => { });
                } else {
                    video.pause();
                }
            },
            seekTo: (time: number) => {
                if (videoRef.current && isFinite(time)) {
                    videoRef.current.currentTime = time;
                }
            },
            skip: (delta: number) => {
                const video = videoRef.current;
                if (video && isFinite(video.duration)) {
                    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
                }
            },
            getCurrentTime: () => videoRef.current?.currentTime ?? 0,
            getDuration: () => videoRef.current?.duration ?? 0,

            // ─── Audio tracks ───
            getAudioTracks: (): AudioTrackInfo[] => {
                const video = videoRef.current;
                if (!video || !(video as any).audioTracks) return [];
                const at = (video as any).audioTracks;
                const tracks: AudioTrackInfo[] = [];
                for (let i = 0; i < at.length; i++) {
                    const t = at[i];
                    tracks.push({
                        id: t.id || String(i),
                        label: t.label || `Ses ${i + 1}`,
                        language: t.language || 'und',
                        enabled: t.enabled,
                    });
                }
                return tracks;
            },

            // ─── Subtitle tracks ───
            getSubtitleTracks: (): SubtitleTrackInfo[] => {
                const video = videoRef.current;
                if (!video || !video.textTracks) return [];
                const tracks: SubtitleTrackInfo[] = [];
                for (let i = 0; i < video.textTracks.length; i++) {
                    const t = video.textTracks[i];
                    if (t.kind === 'subtitles' || t.kind === 'captions') {
                        tracks.push({
                            id: t.id || String(i),
                            label: t.label || `Altyazı ${i + 1}`,
                            language: t.language || 'und',
                            mode: t.mode as 'disabled' | 'hidden' | 'showing',
                        });
                    }
                }
                return tracks;
            },

            // ─── Set audio track ───
            setAudioTrack: (id: string) => {
                const video = videoRef.current;
                if (!video || !(video as any).audioTracks) return;
                const at = (video as any).audioTracks;
                for (let i = 0; i < at.length; i++) {
                    at[i].enabled = (at[i].id === id || String(i) === id);
                }
            },

            // ─── Set subtitle track (null = disable all) ───
            setSubtitleTrack: (id: string | null) => {
                const video = videoRef.current;
                if (!video || !video.textTracks) return;
                for (let i = 0; i < video.textTracks.length; i++) {
                    const t = video.textTracks[i];
                    if (id === null) {
                        t.mode = 'disabled';
                    } else {
                        t.mode = (t.id === id || String(i) === id) ? 'showing' : 'disabled';
                    }
                }
            },
        }));

        // ─── Video event handlers ───
        const handleLoadedData = useCallback(() => {
            setStatus('playing');
            setRetryCount(0);
            const video = videoRef.current;
            if (video) {
                setStreamInfo({ width: video.videoWidth || 0, height: video.videoHeight || 0 });
                if (video.duration && isFinite(video.duration)) {
                    onProgressUpdate?.(0, video.duration);
                }

                // Track detection — slightly delayed because track metadata loads async
                if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
                trackTimerRef.current = setTimeout(() => {
                    if (!videoRef.current) return;
                    scanAndReportTracks(videoRef.current);
                }, 500);
            }
        }, [setStatus, setStreamInfo, onProgressUpdate, scanAndReportTracks]);

        const handleLoadedMetadata = useCallback(() => {
            if (videoRef.current && isFinite(videoRef.current.duration)) {
                const dur = videoRef.current.duration;
                onProgressUpdate?.(0, dur);
            }
        }, [onProgressUpdate]);

        const handleTimeUpdate = useCallback(() => {
            if (videoRef.current) {
                const ct = videoRef.current.currentTime;
                const dur = videoRef.current.duration || 0;
                onProgressUpdate?.(ct, dur);
            }
        }, [onProgressUpdate]);

        const handleVolumeChange = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
            const video = e.currentTarget;
            const newVolume = Math.round(video.volume * 100);
            if (newVolume !== volume) {
                setVolume(newVolume);
            }
            if (video.muted !== muted) {
                setMuted(video.muted);
            }
        }, [volume, muted, setVolume, setMuted]);

        const handleWaiting = useCallback(() => setStatus('buffering'), [setStatus]);
        const handlePlaying = useCallback(() => setStatus('playing'), [setStatus]);
        const handlePause = useCallback(() => setStatus('paused'), [setStatus]);

        const handleError = useCallback(() => {
            const video = videoRef.current;
            const err = video?.error;
            let errorMsg = 'Bilinmeyen hata';

            if (err) {
                switch (err.code) {
                    case 1: errorMsg = 'İndirme işlemi iptal edildi (ABORTED)'; break;
                    case 2: errorMsg = 'Ağ hatası oluştu (NETWORK_ERROR)'; break;
                    case 3: errorMsg = 'Video formatı desteklenmiyor veya dosya bozuk (DECODE_ERROR)'; break;
                    case 4: errorMsg = 'Medya kaynağı bulunamadı veya desteklenmiyor (SRC_NOT_SUPPORTED)'; break;
                    default: errorMsg = `Tanımlanmayan hata kodu: ${err.code}`;
                }
            }
            console.error('[Mp4Player] Error:', err?.code, errorMsg);

            if (retryCount < MAX_RETRIES) {
                setStatus('loading');
                setError(`Bağlantı hatası, yeniden deneniyor... (${retryCount + 1}/${MAX_RETRIES})`);
                retryTimerRef.current = setTimeout(() => {
                    setRetryCount((c) => c + 1);
                    if (videoRef.current) {
                        videoRef.current.pause();
                        videoRef.current.src = '';
                        videoRef.current.load();
                        videoRef.current.src = url;
                        videoRef.current.load();
                        videoRef.current.play().catch(() => { });
                    }
                }, RETRY_DELAY);
            } else {
                setError(`Video oynatılamadı: ${errorMsg}`);
                setStatus('error');
            }
        }, [url, retryCount, setStatus, setError]);

        const handleEnded = useCallback(() => {
            setStatus('idle');
            // If we have an onEnded prop, invoke it here
        }, [setStatus]);

        // ─── Init playback when URL changes ───
        useEffect(() => {
            setRetryCount(0);
            setStatus('loading');
            onTracksDetected?.([], []); // Reset tracks on URL change

            const video = videoRef.current;
            if (!video) return;

            let cancelled = false;

            // Remove old subtitle tracks
            while (video.firstChild) {
                video.removeChild(video.firstChild);
            }

            // Clean stop → clean start
            video.pause();
            video.src = '';
            video.load();

            video.src = url;
            video.load();
            video.play().catch(() => { });

            // ─── Xtream Codes subtitle injection ───
            const creds = parseXtreamVodUrl(url);
            if (creds) {
                fetchXtreamSubtitles(creds).then((subs) => {
                    if (cancelled || !videoRef.current) return;
                    const v = videoRef.current;

                    for (const sub of subs) {
                        const track = document.createElement('track');
                        track.kind = 'subtitles';
                        track.label = sub.label;
                        track.srclang = sub.language;
                        track.src = sub.url;
                        track.default = false;
                        v.appendChild(track);
                    }

                    // If we injected subtitles, re-scan tracks after a small delay
                    if (subs.length > 0) {
                        if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
                        trackTimerRef.current = setTimeout(() => {
                            if (!cancelled && videoRef.current) {
                                scanAndReportTracks(videoRef.current);
                            }
                        }, 300);
                    }
                });
            }

            return () => {
                cancelled = true;
                if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
                if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
                video.pause();
                video.src = '';
                video.load();
                while (video.firstChild) {
                    video.removeChild(video.firstChild);
                }
            };
        }, [url, setStatus, scanAndReportTracks]);

        // ─── Volume sync ───
        useEffect(() => {
            if (videoRef.current) {
                videoRef.current.volume = volume / 100;
                videoRef.current.muted = muted;
            }
        }, [volume, muted]);

        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    preload="auto"
                    onLoadedData={handleLoadedData}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onVolumeChange={handleVolumeChange}
                    onWaiting={handleWaiting}
                    onPlaying={handlePlaying}
                    onPause={handlePause}
                    onEnded={handleEnded}
                    onError={handleError}
                />
            </div>
        );
    }
));
