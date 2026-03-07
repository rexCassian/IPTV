import React, { useEffect, useRef, memo } from 'react';
import Hls from 'hls.js';
import { usePlayerStore } from '../../store/playerStore';

export const HlsPlayer = memo(function HlsPlayer() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { url, status, setStatus, setError, volume, muted } = usePlayerStore();
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !url) return;

        setStatus('loading');

        let hls: Hls;

        const initHls = () => {
            if (Hls.isSupported()) {
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                }

                hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                });

                hlsRef.current = hls;

                hls.loadSource(url);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setStatus('playing');
                    video.play().catch((e) => {
                        console.error('Play blocked:', e);
                        setStatus('paused');
                    });
                });

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                setError(`HLS Error: ${data.details}`);
                                setStatus('error');
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native support fallback for Safari (if applicable)
                video.src = url;
                video.addEventListener('loadedmetadata', () => {
                    setStatus('playing');
                    video.play().catch(e => console.error(e));
                });
            } else {
                setError('HLS (m3u8) format is not supported uniquely in your environment.');
                setStatus('error');
            }
        };

        initHls();

        const handleWaiting = () => setStatus('buffering');
        const handlePlaying = () => setStatus('playing');
        const handlePause = () => setStatus('paused');

        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('pause', handlePause);

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('pause', handlePause);
        };
    }, [url, setStatus, setError]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume / 100;
            videoRef.current.muted = muted;
        }
    }, [volume, muted]);

    useEffect(() => {
        if (videoRef.current) {
            if (status === 'playing' && videoRef.current.paused) {
                videoRef.current.play().catch(e => console.error(e));
            } else if (status === 'paused' && !videoRef.current.paused) {
                videoRef.current.pause();
            }
        }
    }, [status]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black' }}>
            <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        </div>
    );
});
