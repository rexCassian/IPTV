import React, { memo, useCallback } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, Info, ChevronLeft } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useUiStore } from '../../store/uiStore';
import { useEPG } from '../../hooks/useEPG';
import { EPGProgressBar } from '../EPG/EPGProgressBar';
import { formatTime } from '../../utils/timeFormatter';

export const PlayerControls = memo(function PlayerControls() {
    const player = usePlayerStore();
    const { isFullscreen, toggleFullscreen, toggleStreamInfo, toggleSidebar, sidebarCollapsed } = useUiStore();

    const { currentProgram, getProgress } = useEPG(player.currentChannel?.id || null);
    const progress = getProgress(currentProgram);

    const handleVolumeChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const volume = parseInt(e.target.value, 10);
            player.setVolume(volume);
            window.electronAPI.player.setVolume(volume);
        },
        [player],
    );

    const handleMuteToggle = useCallback(() => {
        player.toggleMute();
        window.electronAPI.player.toggleMute();
    }, [player]);

    return (
        <div className="relative bg-gradient-to-t from-dark-950/95 via-dark-950/80 to-transparent px-4 py-3">
            {/* EPG Progress */}
            {currentProgram && (
                <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-white/80 font-medium truncate max-w-[60%]">
                            {currentProgram.title}
                        </span>
                        <span className="text-dark-400 ml-2 shrink-0">
                            {formatTime(currentProgram.startTime)} — {formatTime(currentProgram.endTime)}
                        </span>
                    </div>
                    <EPGProgressBar progress={progress} />
                </div>
            )}

            {/* Controls Row */}
            <div className="flex items-center gap-3">
                {/* Sidebar Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 text-dark-300 hover:text-white transition-colors rounded-md hover:bg-white/10"
                    title={sidebarCollapsed ? 'Paneli göster' : 'Paneli gizle'}
                >
                    <ChevronLeft
                        size={18}
                        className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Channel Name */}
                <div className="flex-1 min-w-0">
                    {player.currentChannel && (
                        <div className="flex items-center gap-2">
                            {player.currentChannel.logo && (
                                <img
                                    src={player.currentChannel.logo}
                                    alt=""
                                    className="w-6 h-6 rounded object-contain bg-dark-800"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                            <span className="text-sm font-medium text-white truncate">
                                {player.currentChannel.name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleMuteToggle}
                        className="p-1.5 text-dark-300 hover:text-white transition-colors rounded-md hover:bg-white/10"
                        title={player.muted ? 'Sesi aç' : 'Sessiz'}
                    >
                        {player.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={player.muted ? 0 : player.volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-dark-600 rounded-full appearance-none cursor-pointer accent-accent-500
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500
              [&::-webkit-slider-thumb]:hover:bg-accent-400 [&::-webkit-slider-thumb]:transition-colors"
                    />
                </div>

                {/* Stream Info Toggle */}
                <button
                    onClick={toggleStreamInfo}
                    className="p-1.5 text-dark-300 hover:text-white transition-colors rounded-md hover:bg-white/10"
                    title="Akış bilgisi"
                >
                    <Info size={18} />
                </button>

                {/* Fullscreen Toggle */}
                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 text-dark-300 hover:text-white transition-colors rounded-md hover:bg-white/10"
                    title={isFullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran (F)'}
                >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
            </div>
        </div>
    );
});
