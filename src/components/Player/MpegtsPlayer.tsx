import React, { memo, useRef, useEffect, useCallback } from 'react';
import mpegts from 'mpegts.js';
import { usePlayerStore } from '../../store/playerStore';

interface MpegtsPlayerProps {
    url: string;
}

export const MpegtsPlayer = memo(function MpegtsPlayer({ url }: MpegtsPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<mpegts.Player | null>(null);
    const { setStatus, setError, setStreamInfo, volume, muted } = usePlayerStore();

    const destroyPlayer = useCallback(() => {
        if (playerRef.current) {
            try {
                playerRef.current.pause();
                playerRef.current.unload();
                playerRef.current.detachMediaElement();
                playerRef.current.destroy();
            } catch {
                // Ignore cleanup errors
            }
            playerRef.current = null;
        }
    }, []);

    const initPlayer = useCallback(() => {
        if (!videoRef.current || !mpegts.isSupported()) {
            setError('MPEG-TS desteklenmiyor');
            return;
        }

        destroyPlayer();

        const player = mpegts.createPlayer(
            {
                type: 'mpegts',
                url: url,
                isLive: true,
            },
            {
                enableWorker: true,
                enableStashBuffer: true,
                stashInitialSize: 512 * 1024,
                lazyLoadMaxDuration: 3,
                seekType: 'range',
                liveBufferLatencyChasing: true,
                liveBufferLatencyMaxLatency: 2,
                liveBufferLatencyMinRemain: 0.5,
            },
        );

        player.attachMediaElement(videoRef.current);

        player.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
            console.error('[MpegtsPlayer] Error:', errorType, errorDetail, errorInfo);
            if (errorType === mpegts.ErrorTypes.NETWORK_ERROR) {
                setError(`Ağ hatası: ${errorDetail}`);
                // Auto-retry on network errors
                setTimeout(() => {
                    if (playerRef.current) {
                        try {
                            playerRef.current.unload();
                            playerRef.current.load();
                            playerRef.current.play();
                        } catch {
                            // Ignore retry errors
                        }
                    }
                }, 2000);
            } else if (errorType === mpegts.ErrorTypes.MEDIA_ERROR) {
                setError(`Medya hatası: ${errorDetail}`);
            } else {
                setError(`Oynatma hatası: ${errorDetail}`);
            }
        });

        player.on(mpegts.Events.STATISTICS_INFO, (stats) => {
            if (stats.speed !== undefined) {
                setStreamInfo({
                    bitrate: Math.round(stats.speed * 8),
                });
            }
        });

        player.on(mpegts.Events.MEDIA_INFO, (mediaInfo) => {
            if (mediaInfo.videoCodec) {
                setStreamInfo({
                    codec: mediaInfo.videoCodec,
                    width: mediaInfo.width || 0,
                    height: mediaInfo.height || 0,
                    fps: mediaInfo.videoFrameRate || 0,
                });
            }
        });

        player.load();
        player.play().then(() => {
            setStatus('playing');
        }).catch((err) => {
            console.error('[MpegtsPlayer] Play error:', err);
        });

        playerRef.current = player;
    }, [url, destroyPlayer, setStatus, setError, setStreamInfo]);

    // Initialize/reinitialize when URL changes
    useEffect(() => {
        initPlayer();
        return () => {
            destroyPlayer();
        };
    }, [url, initPlayer, destroyPlayer]);

    // Volume sync
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
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                onWaiting={() => setStatus('buffering')}
                onPlaying={() => setStatus('playing')}
                onError={() => setError('Video oynatma hatası')}
            />
        </div>
    );
});
