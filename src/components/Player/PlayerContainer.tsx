import React, { memo, useRef, useState, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { MpvPlayer } from './MpvPlayer';
import { MpegtsPlayer } from './MpegtsPlayer';
import { Mp4Player } from './Mp4Player';
import type { Mp4PlayerHandle, AudioTrackInfo, SubtitleTrackInfo } from './Mp4Player';
import { PlayerControls } from './PlayerControls';
import { LoadingOverlay } from './LoadingOverlay';
import { ErrorOverlay } from './ErrorOverlay';
import { StreamInfo } from './StreamInfo';
import { PlayPauseIndicator } from './PlayPauseIndicator';
import { OSDManager, OSDEvent } from './OSDManager';
import { useUiStore } from '../../store/uiStore';
import { Volume2, VolumeX, SkipForward, SkipBack } from 'lucide-react';

export const PlayerContainer = memo(function PlayerContainer() {
    const mp4Ref = useRef<Mp4PlayerHandle>(null);
    const [mp4Progress, setMp4Progress] = useState(0);
    const [mp4Duration, setMp4Duration] = useState(0);
    const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
    const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackInfo[]>([]);

    const handleTracksDetected = useCallback((audio: AudioTrackInfo[], subs: SubtitleTrackInfo[]) => {
        setAudioTracks(audio);
        setSubtitleTracks(subs);
    }, []);

    const { engine, status, currentChannel, errorMessage, url } = usePlayerStore();
    const { showStreamInfo, isFullscreen } = useUiStore();

    const [osdEvents, setOsdEvents] = useState<OSDEvent[]>([]);
    const triggerOSD = useCallback((icon: React.ReactNode, text: string, position: OSDEvent['position'] = 'right') => {
        const id = Date.now();
        setOsdEvents([{ id, icon, text, position }]);
        setTimeout(() => {
            setOsdEvents((prev) => prev.filter((ev) => ev.id !== id));
        }, 1500);
    }, []);

    // Mouse Idle Detection (for Fullscreen Auto-hide)
    const [isIdle, setIsIdle] = useState(false);
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const handleMouseMove = () => {
            setIsIdle(false);
            clearTimeout(timeout);
            // In fullscreen, hide controls after 3 seconds of inactivity
            if (isFullscreen) {
                timeout = setTimeout(() => setIsIdle(true), 3000);
            }
        };

        const handleMouseLeave = () => {
            if (isFullscreen) setIsIdle(true);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        // Run immediately when entering fullscreen
        handleMouseMove();

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            clearTimeout(timeout);
        };
    }, [isFullscreen]);

    // Keyboard Shortcuts (Hotkeys)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Focus on input elements should prevent shortcut triggers
            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isInput = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

            if (isInput) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    if (engine === 'mp4' && mp4Ref.current) {
                        mp4Ref.current.togglePlay();
                    }
                    break;
                case 'arrowright':
                    e.preventDefault();
                    if (engine === 'mp4' && mp4Ref.current) {
                        mp4Ref.current.skip(10);
                        triggerOSD(<SkipForward />, '+10s', 'right');
                    }
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    if (engine === 'mp4' && mp4Ref.current) {
                        mp4Ref.current.skip(-10);
                        triggerOSD(<SkipBack />, '-10s', 'left');
                    }
                    break;
                case 'm':
                    e.preventDefault();
                    const st = usePlayerStore.getState();
                    st.toggleMute();
                    triggerOSD(st.muted ? <Volume2 /> : <VolumeX />, st.muted ? 'Sesi Aç' : 'Sessiz', 'top-right');
                    break;
                case 'f':
                    e.preventDefault();
                    useUiStore.getState().toggleFullscreen();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [engine]);

    return (
        <div
            className={`flex flex-col bg-black relative flex-1 w-full h-full ${isFullscreen && isIdle ? 'cursor-none' : ''}`}
        >
            {/* Video Area */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                {/* Idle State */}
                {status === 'idle' && !currentChannel && (
                    <div className="flex flex-col items-center gap-4 text-dark-400">
                        <div className="w-20 h-20 rounded-full bg-dark-900/50 flex items-center justify-center">
                            <svg
                                className="w-10 h-10"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                                />
                            </svg>
                        </div>
                        <p className="text-sm font-medium">Kanal seçin veya arama yapın</p>
                        <p className="text-xs text-dark-500">Sol panelden bir kanal seçerek yayın izlemeye başlayın</p>
                    </div>
                )}

                {/* MPV Player (fallback) */}
                {engine === 'mpv' && (
                    <MpvPlayer />
                )}

                {/* MPEG-TS Player (live streams + HLS) */}
                {engine === 'mpegts' && url && (
                    <MpegtsPlayer
                        url={url}
                        isVod={currentChannel?.contentType === 'movie' || currentChannel?.contentType === 'series'}
                    />
                )}

                {/* MP4 Player (VOD — movies, series) */}
                {engine === 'mp4' && url && (
                    <Mp4Player
                        ref={mp4Ref}
                        url={url}
                        onProgressUpdate={(progress, duration) => {
                            setMp4Progress(progress);
                            setMp4Duration(duration);
                        }}
                        onTracksDetected={handleTracksDetected}
                    />
                )}

                {/* Loading Overlay */}
                {status === 'loading' && <LoadingOverlay channelName={currentChannel?.name} />}

                {/* Buffering Overlay */}
                {status === 'buffering' && <LoadingOverlay channelName={currentChannel?.name} buffering />}

                {/* Error Overlay */}
                {status === 'error' && errorMessage && (
                    <ErrorOverlay message={errorMessage} />
                )}

                {/* Stream Info */}
                {showStreamInfo && status === 'playing' && <StreamInfo />}

                {/* Animated Central Play/Pause Indicator (Apple TV style) */}
                {engine === 'mp4' && url && (
                    <PlayPauseIndicator
                        status={status}
                        onAction={() => {
                            if (mp4Ref.current) {
                                mp4Ref.current.togglePlay();
                            }
                        }}
                    />
                )}

                {/* OSD (On-Screen Display) */}
                <OSDManager events={osdEvents} />
            </div>

            {/* Player Controls Layer */}
            <div className="absolute inset-0 z-50 pointer-events-none">
                <PlayerControls
                    mp4Ref={mp4Ref}
                    mp4Progress={mp4Progress}
                    mp4Duration={mp4Duration}
                    audioTracks={audioTracks}
                    subtitleTracks={subtitleTracks}
                    isIdle={isFullscreen && isIdle}
                />
            </div>
        </div>
    );
});
