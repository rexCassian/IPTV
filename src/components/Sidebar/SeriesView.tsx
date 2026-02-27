import React, { memo, useState, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronLeft, ChevronRight, Tv, Play } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';
import { playChannel } from '../../utils/playerActions';
import { parseSeriesName } from '../../utils/seriesParser';
import type { SeriesGroup } from '../../utils/seriesParser';
import type { Channel } from '../../types/channel';

type NavLevel = 'shows' | 'seasons' | 'episodes';

export const SeriesView = memo(function SeriesView() {
    const { seriesGroups, filter } = useChannelStore();
    const [level, setLevel] = useState<NavLevel>('shows');
    const [selectedShow, setSelectedShow] = useState<SeriesGroup | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

    // ─── Search filtering on seriesGroups by showName ───
    const filteredShows = useMemo(() => {
        if (!filter.search) return seriesGroups;
        const q = filter.search.toLowerCase();
        return seriesGroups.filter((s) =>
            s.showName.toLowerCase().includes(q)
        );
    }, [seriesGroups, filter.search]);

    const handleShowClick = useCallback((show: SeriesGroup) => {
        setSelectedShow(show);
        setLevel('seasons');
    }, []);

    const handleSeasonClick = useCallback((season: number) => {
        setSelectedSeason(season);
        setLevel('episodes');
    }, []);

    const goBack = useCallback(() => {
        if (level === 'episodes') { setLevel('seasons'); setSelectedSeason(null); }
        else { setLevel('shows'); setSelectedShow(null); }
    }, [level]);

    // Reset to shows list when search changes
    const prevSearch = useRef(filter.search);
    if (filter.search !== prevSearch.current) {
        prevSearch.current = filter.search;
        if (level !== 'shows') {
            setLevel('shows');
            setSelectedShow(null);
            setSelectedSeason(null);
        }
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Breadcrumb */}
            {level !== 'shows' && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', borderBottom: '1px solid var(--glass-border)',
                    background: 'rgba(108,99,255,0.06)', flexShrink: 0,
                }}>
                    <button
                        onClick={goBack}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '3px 8px', borderRadius: 6,
                            border: '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)', color: 'var(--text-secondary)',
                            fontFamily: 'Outfit, sans-serif', fontSize: 11,
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronLeft size={12} />
                        {level === 'episodes' ? selectedShow?.showName : 'Diziler'}
                    </button>
                    <p style={{
                        fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 600,
                        color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {level === 'episodes'
                            ? `Sezon ${selectedSeason}`
                            : selectedShow?.showName}
                    </p>
                </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {level === 'shows' && <ShowsList shows={filteredShows} onSelect={handleShowClick} />}
                {level === 'seasons' && selectedShow && (
                    <SeasonsList show={selectedShow} onSelect={handleSeasonClick} />
                )}
                {level === 'episodes' && selectedShow && selectedSeason !== null && (
                    <EpisodesList episodes={selectedShow.seasons[selectedSeason] || []} />
                )}
            </div>
        </div>
    );
});

/* ── Level 1: Shows list (virtual scroll) ── */
const ShowsList = memo(function ShowsList({
    shows, onSelect,
}: { shows: SeriesGroup[]; onSelect: (s: SeriesGroup) => void }) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: shows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 52,
        overscan: 8,
    });

    if (shows.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 8, padding: 24 }}>
                <Tv size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, textAlign: 'center' }}>
                    Dizi bulunamadı
                </p>
            </div>
        );
    }

    return (
        <div ref={parentRef} className="channel-scroll" style={{ height: '100%', overflowY: 'auto' }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((vRow) => {
                    const show = shows[vRow.index];
                    const seasonCount = Object.keys(show.seasons).length;
                    return (
                        <div key={vRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vRow.size, transform: `translateY(${vRow.start}px)` }}>
                            <button
                                onClick={() => onSelect(show)}
                                style={{
                                    width: 'calc(100% - 12px)', margin: '1px 6px',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 10px',
                                    border: '1px solid transparent', borderRadius: 10,
                                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
                            >
                                {/* Poster */}
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                    background: show.poster
                                        ? `url(${show.poster}) center/cover no-repeat, rgba(108,99,255,0.1)`
                                        : 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,212,255,0.1))',
                                    border: '1px solid rgba(108,99,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {!show.poster && <Tv size={16} style={{ color: 'var(--accent)' }} />}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {show.showName}
                                    </p>
                                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--accent)', marginTop: 1 }}>
                                        {seasonCount > 1 ? `${seasonCount} Sezon · ` : ''}{show.totalEpisodes} bölüm
                                    </p>
                                </div>

                                <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

/* ── Level 2: Seasons ── */
const SeasonsList = memo(function SeasonsList({
    show, onSelect,
}: { show: SeriesGroup; onSelect: (season: number) => void }) {
    const seasons = Object.keys(show.seasons).map(Number).sort((a, b) => a - b);

    return (
        <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8, overflowY: 'auto', height: '100%' }}>
            {seasons.map((season) => {
                const eps = show.seasons[season];
                return (
                    <button
                        key={season}
                        onClick={() => onSelect(season)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            minWidth: 80,
                            transition: 'background 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,99,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(108,99,255,0.4)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'; }}
                    >
                        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                            Sezon {season}
                        </p>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                            {eps.length} bölüm
                        </p>
                    </button>
                );
            })}
        </div>
    );
});

/* ── Level 3: Episodes (virtual scroll) ── */
const EpisodesList = memo(function EpisodesList({ episodes }: { episodes: Channel[] }) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: episodes.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 44,
        overscan: 8,
    });

    return (
        <div ref={parentRef} className="channel-scroll" style={{ height: '100%', overflowY: 'auto' }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((vRow) => {
                    const ep = episodes[vRow.index];
                    const info = parseSeriesName(ep.name);
                    return (
                        <div key={vRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vRow.size, transform: `translateY(${vRow.start}px)` }}>
                            <button
                                onClick={() => playChannel(ep)}
                                style={{
                                    width: 'calc(100% - 12px)', margin: '1px 6px',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 10px',
                                    border: '1px solid transparent', borderRadius: 8,
                                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
                            >
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--accent)', flexShrink: 0, minWidth: 40 }}>
                                    {info ? `S${String(info.season).padStart(2, '0')}E${String(info.episode).padStart(2, '0')}` : `#${vRow.index + 1}`}
                                </span>
                                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {info?.episodeTitle || ep.name}
                                </p>
                                <Play size={12} fill="currentColor" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
