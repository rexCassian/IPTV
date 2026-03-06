import React, { memo, useCallback, useState, useEffect } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, Info, ChevronLeft, SkipBack, SkipForward, Languages, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import { useUiStore } from '../../store/uiStore';
import { useEPG } from '../../hooks/useEPG';
import { EPGProgressBar } from '../EPG/EPGProgressBar';
import { formatTime } from '../../utils/timeFormatter';
import type { Mp4PlayerHandle, AudioTrackInfo, SubtitleTrackInfo } from './Mp4Player';
import { CustomScrubber } from './CustomScrubber';

interface PlayerControlsProps {
    mp4Ref?: React.RefObject<Mp4PlayerHandle | null>;
    mp4Progress?: number;
    mp4Duration?: number;
    audioTracks?: AudioTrackInfo[];
    subtitleTracks?: SubtitleTrackInfo[];
    isIdle?: boolean;
}

function fmtTime(secs: number): string {
    if (!isFinite(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function langName(code: string): string {
    const map: Record<string, string> = {
        tr: 'Türkçe', en: 'İngilizce', de: 'Almanca',
        fr: 'Fransızca', es: 'İspanyolca', it: 'İtalyanca',
        pt: 'Portekizce', ru: 'Rusça', ar: 'Arapça',
        ja: 'Japonca', ko: 'Korece', zh: 'Çince',
        nl: 'Hollandaca', pl: 'Lehçe', sv: 'İsveççe',
        no: 'Norveççe', da: 'Danimarkaca', fi: 'Fince',
        el: 'Yunanca', hu: 'Macarca', cs: 'Çekçe',
        ro: 'Romence', bg: 'Bulgarca', hr: 'Hırvatça',
        und: 'Bilinmiyor',
    };
    return map[code.toLowerCase()] ?? code.toUpperCase();
}

export const PlayerControls = memo(function PlayerControls({
    mp4Ref,
    mp4Progress = 0,
    mp4Duration = 0,
    audioTracks: propAudioTracks,
    subtitleTracks: propSubtitleTracks,
    isIdle = false,
}: PlayerControlsProps) {
    const player = usePlayerStore();
    const { isFullscreen, toggleFullscreen, toggleStreamInfo, toggleSidebar, sidebarCollapsed } = useUiStore();

    const { currentProgram, getProgress } = useEPG(player.currentChannel?.id || null);
    const progress = getProgress(currentProgram);

    // Seek states
    const [isScrubbing, setIsScrubbing] = useState(false);
    // When scrubbing, we might not want to hide the UI even if the mouse is still.
    // We treat effectively idle = isIdle && !isScrubbing && !showTrackPanel.

    // Track panel state
    const [showTrackPanel, setShowTrackPanel] = useState(false);
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    const [activeSubId, setActiveSubId] = useState<string | null>(null);
    const [localAudioTracks, setLocalAudioTracks] = useState<AudioTrackInfo[]>([]);
    const [localSubTracks, setLocalSubTracks] = useState<SubtitleTrackInfo[]>([]);

    // Use prop tracks if available, otherwise query mp4Ref on demand
    const audioTracks = propAudioTracks ?? localAudioTracks;
    const subtitleTracks = propSubtitleTracks ?? localSubTracks;
    const hasTracks = audioTracks.length > 1 || subtitleTracks.length > 0;

    // Reset track state when a new video loads
    useEffect(() => {
        if (mp4Duration === 0) {
            setActiveAudioId(null);
            setActiveSubId(null);
            setShowTrackPanel(false);
            setLocalAudioTracks([]);
            setLocalSubTracks([]);
        }
    }, [mp4Duration === 0]);

    // Fetch tracks from mp4Ref when panel is opened (if not passed as props)
    const handleToggleTrackPanel = useCallback(() => {
        setShowTrackPanel((prev) => {
            const next = !prev;
            if (next && mp4Ref?.current && !propAudioTracks && !propSubtitleTracks) {
                setLocalAudioTracks(mp4Ref.current.getAudioTracks());
                setLocalSubTracks(mp4Ref.current.getSubtitleTracks());
            }
            return next;
        });
    }, [mp4Ref, propAudioTracks, propSubtitleTracks]);

    // Close panel when clicking outside
    useEffect(() => {
        if (!showTrackPanel) return;
        const handle = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-track-panel]')) {
                setShowTrackPanel(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showTrackPanel]);

    const handleAudioSelect = useCallback((id: string) => {
        mp4Ref?.current?.setAudioTrack(id);
        setActiveAudioId(id);
        setShowTrackPanel(false);
    }, [mp4Ref]);

    const handleSubtitleSelect = useCallback((id: string | null) => {
        mp4Ref?.current?.setSubtitleTrack(id);
        setActiveSubId(id);
        setShowTrackPanel(false);
    }, [mp4Ref]);

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

    const controlIsVisible = !isIdle || isScrubbing || showTrackPanel;

    return (
        <AnimatePresence>
            {controlIsVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="absolute inset-0 pointer-events-none flex flex-col justify-between z-50 overflow-hidden"
                >
                    {/* ── TOP BAR (Gradient down) ── */}
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full bg-gradient-to-b from-dark-950/90 via-dark-950/40 to-transparent pt-6 pb-12 px-6 flex items-center justify-between pointer-events-auto"
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleSidebar}
                                className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/15 backdrop-blur-md rounded-full transition-all"
                                title={sidebarCollapsed ? 'Menüyü Göster' : 'Menüyü Gizle'}
                            >
                                <ChevronLeft size={20} className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                            </button>

                            {player.currentChannel && (
                                <div className="flex items-center gap-3">
                                    {player.currentChannel.logo && (
                                        <img
                                            src={player.currentChannel.logo}
                                            alt=""
                                            className="w-10 h-10 rounded shadow-md object-contain bg-white/5"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <div className="flex flex-col">
                                        <h1 className="text-xl font-semibold text-white/95 tracking-wide drop-shadow-md">
                                            {player.currentChannel.name}
                                        </h1>
                                        {/* EPG Canlı Yayın Başlığı */}
                                        {player.engine !== 'mp4' && currentProgram && (
                                            <span className="text-sm text-white/60 font-medium">
                                                {currentProgram.title} <span className="mx-1">•</span> {formatTime(currentProgram.startTime)} - {formatTime(currentProgram.endTime)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top Right Controls if needed, eg Settings */}
                    </motion.div>

                    {/* ── BOTTOM BAR (Gradient up) ── */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full bg-gradient-to-t from-dark-950/95 via-dark-950/70 to-transparent pt-12 pb-6 px-6 flex flex-col gap-4 pointer-events-auto"
                    >
                        {/* Canlı Yayın EPG Bar */}
                        {player.engine !== 'mp4' && currentProgram && (
                            <div className="w-full">
                                <EPGProgressBar progress={progress} />
                            </div>
                        )}

                        {/* VOD Scrubber */}
                        {player.engine === 'mp4' && mp4Duration > 0 && (
                            <div className="w-full flex items-center gap-4">
                                <span className="text-sm font-medium text-white/70 tabular-nums shrink-0 w-12 text-right">
                                    {fmtTime(mp4Progress)}
                                </span>
                                <div className="flex-1 flex items-center">
                                    <CustomScrubber
                                        progress={mp4Progress}
                                        duration={mp4Duration}
                                        onSeek={(t) => mp4Ref?.current?.seekTo(t)}
                                        onSeekStart={() => setIsScrubbing(true)}
                                        onSeekEnd={() => setIsScrubbing(false)}
                                    />
                                </div>
                                <span className="text-sm font-medium text-white/40 tabular-nums shrink-0 w-12">
                                    {fmtTime(mp4Duration)}
                                </span>
                            </div>
                        )}

                        {/* Controls Row */}
                        <div className="flex items-center justify-between mt-2">
                            {/* Left Controls */}
                            <div className="flex items-center gap-4">
                                {player.engine === 'mp4' && (
                                    <>
                                        <button
                                            onClick={() => mp4Ref?.current?.togglePlay()}
                                            className="p-2 text-white hover:scale-110 hover:text-accent-400 transition-all drop-shadow-md"
                                        >
                                            {player.status === 'playing' ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                        </button>
                                        <button
                                            onClick={() => mp4Ref?.current?.skip(-10)}
                                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                            title="10 saniye geri"
                                        >
                                            <SkipBack size={20} />
                                        </button>
                                        <button
                                            onClick={() => mp4Ref?.current?.skip(10)}
                                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                            title="10 saniye ileri"
                                        >
                                            <SkipForward size={20} />
                                        </button>
                                    </>
                                )}

                                {/* Volume Control */}
                                <div className="flex items-center gap-2 group">
                                    <button
                                        onClick={handleMuteToggle}
                                        className="p-2 text-white/70 hover:text-white transition-colors"
                                        title={player.muted ? 'Sesi aç' : 'Sessiz'}
                                    >
                                        {player.muted || player.volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                    </button>
                                    <div className="w-0 group-hover:w-24 transition-all duration-300 overflow-hidden flex items-center h-8">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={player.muted ? 0 : player.volume}
                                            onChange={handleVolumeChange}
                                            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white
                                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                                                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                                                [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center gap-3 relative">
                                {/* Track Selection (Subtitles / Audio) */}
                                {player.engine === 'mp4' && hasTracks && (
                                    <>
                                        <button
                                            data-track-panel
                                            onClick={handleToggleTrackPanel}
                                            className={`p-2 transition-all rounded-md flex items-center justify-center ${showTrackPanel ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                            title="Ses / Altyazı Seç"
                                        >
                                            <Languages size={20} />
                                        </button>

                                        {/* Premium Glassmorphism Track Panel */}
                                        <AnimatePresence>
                                            {showTrackPanel && (
                                                <motion.div
                                                    data-track-panel
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                                    className="absolute bottom-full right-10 mb-4 bg-dark-950/70 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 min-w-[240px] z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] origin-bottom-right overflow-hidden flex flex-col gap-1"
                                                >
                                                    {audioTracks.length > 1 && (
                                                        <div className="mb-2">
                                                            <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-white/40 uppercase">
                                                                Ses Kanalı
                                                            </div>
                                                            {audioTracks.map((track) => (
                                                                <button
                                                                    key={track.id}
                                                                    onClick={() => handleAudioSelect(track.id)}
                                                                    className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10"
                                                                >
                                                                    <span>{track.label || langName(track.language)}</span>
                                                                    {(activeAudioId === track.id || track.enabled) && (
                                                                        <span className="w-2 h-2 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(108,99,255,0.9)]" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {audioTracks.length > 1 && subtitleTracks.length > 0 && (
                                                        <div className="w-full h-px bg-white/5 my-1" />
                                                    )}

                                                    {subtitleTracks.length > 0 && (
                                                        <div>
                                                            <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-white/40 uppercase">
                                                                Altyazı
                                                            </div>
                                                            <button
                                                                onClick={() => handleSubtitleSelect(null)}
                                                                className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10"
                                                            >
                                                                <span>Kapalı</span>
                                                                {activeSubId === null && (
                                                                    <span className="w-2 h-2 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(108,99,255,0.9)]" />
                                                                )}
                                                            </button>
                                                            {subtitleTracks.map((track) => (
                                                                <button
                                                                    key={track.id}
                                                                    onClick={() => handleSubtitleSelect(track.id)}
                                                                    className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10"
                                                                >
                                                                    <span>{track.label || langName(track.language)}</span>
                                                                    {activeSubId === track.id && (
                                                                        <span className="w-2 h-2 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(108,99,255,0.9)]" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}

                                <button
                                    onClick={toggleStreamInfo}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                    title="Akış Bilgisi"
                                >
                                    <Info size={20} />
                                </button>

                                <button
                                    onClick={toggleFullscreen}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-2"
                                    title={isFullscreen ? 'Tam Ekrandan Çık (F)' : 'Tam Ekran (F)'}
                                >
                                    {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
