import React, { memo } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { MpvPlayer } from './MpvPlayer';
import { MpegtsPlayer } from './MpegtsPlayer';
import { PlayerControls } from './PlayerControls';
import { LoadingOverlay } from './LoadingOverlay';
import { ErrorOverlay } from './ErrorOverlay';
import { StreamInfo } from './StreamInfo';
import { useUiStore } from '../../store/uiStore';

export const PlayerContainer = memo(function PlayerContainer() {
    const { engine, status, currentChannel, errorMessage, url } = usePlayerStore();
    const { showStreamInfo, isFullscreen } = useUiStore();

    return (
        <div className={`relative flex flex-col bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'flex-1'}`}>
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

                {/* MPV Player (HLS) */}
                {engine === 'mpv' && (
                    <MpvPlayer />
                )}

                {/* MPEG-TS Player (HTML5) */}
                {engine === 'mpegts' && url && (
                    <MpegtsPlayer url={url} />
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
            </div>

            {/* Player Controls */}
            <PlayerControls />
        </div>
    );
});
