import React, { memo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Film } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';
import { playChannel } from '../../utils/playerActions';
import type { Channel } from '../../types/channel';

const ITEM_HEIGHT = 72;
const COL = 2;

export const MoviesView = memo(function MoviesView() {
    const { filteredChannels, movieChannels, filter } = useChannelStore();
    const parentRef = useRef<HTMLDivElement>(null);

    // When no filter active, show all movies; else use filtered result
    const movies: Channel[] = filter.search ? filteredChannels : movieChannels;

    // Group into rows of 2
    const rowCount = Math.ceil(movies.length / COL);

    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 5,
    });

    const handlePlay = useCallback((ch: Channel) => {
        playChannel(ch);
    }, []);

    if (movies.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 8 }}>
                <Film size={36} style={{ opacity: 0.3 }} />
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13 }}>Film bulunamadı</p>
            </div>
        );
    }

    return (
        <div ref={parentRef} className="channel-scroll" style={{ height: '100%', overflowY: 'auto', padding: '4px 6px' }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                {virtualizer.getVirtualItems().map((vRow) => {
                    const rowStart = vRow.index * COL;
                    const rowMovies = movies.slice(rowStart, rowStart + COL);

                    return (
                        <div
                            key={vRow.key}
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '100%', height: vRow.size,
                                transform: `translateY(${vRow.start}px)`,
                                display: 'flex', gap: 4, padding: '2px 0',
                            }}
                        >
                            {rowMovies.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} onPlay={handlePlay} />
                            ))}
                            {/* Empty filler for last row odd count */}
                            {rowMovies.length < COL && <div style={{ flex: 1 }} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

const MovieCard = memo(function MovieCard({
    movie, onPlay,
}: { movie: Channel; onPlay: (ch: Channel) => void }) {
    return (
        <button
            onClick={() => onPlay(movie)}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 0,
                borderRadius: 8,
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                cursor: 'pointer',
                overflow: 'hidden',
                height: 68,
                transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border-bright)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
            }}
        >
            {/* Poster / Logo area */}
            <div style={{
                height: 40,
                background: movie.logo
                    ? `url(${movie.logo}) center/cover no-repeat, rgba(255,255,255,0.04)`
                    : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                {!movie.logo && <Film size={18} style={{ color: '#F59E0B', opacity: 0.6 }} />}
            </div>

            {/* Title */}
            <div style={{ padding: '3px 5px', flex: 1, display: 'flex', alignItems: 'center' }}>
                <p style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3,
                    textAlign: 'left',
                }}>
                    {movie.name}
                </p>
            </div>
        </button>
    );
}, (prev, next) => prev.movie.id === next.movie.id);
