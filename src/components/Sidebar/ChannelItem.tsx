import React, { memo, useCallback } from 'react';
import { Star, Radio } from 'lucide-react';
import { ChannelLogo } from './ChannelLogo';
import { playChannel } from '../../utils/playerActions';
import { useChannelStore } from '../../store/channelStore';
import type { Channel } from '../../types/channel';

interface ChannelItemProps {
    channel: Channel;
    isSelected: boolean;
    isPlaying: boolean;
    isFavorite: boolean;
    index: number;
    onSelect: (index: number) => void;
    onPlay?: (channel: Channel) => void;
}

export const ChannelItem = memo(
    function ChannelItem({ channel, isSelected, isPlaying, isFavorite, index, onSelect, onPlay }: ChannelItemProps) {
        const handleClick = useCallback(() => {
            onSelect(index);
            if (onPlay) onPlay(channel);
            else playChannel(channel);
        }, [channel, index, onSelect, onPlay]);

        const handleFavClick = useCallback(
            (e: React.MouseEvent) => {
                e.stopPropagation();
                window.electronAPI.favorites.toggle(channel.id).then(() => {
                    useChannelStore.getState().toggleFavorite(channel.id);
                });
            },
            [channel.id],
        );

        return (
            <div
                onClick={handleClick}
                className={`channel-item-glass${isPlaying ? ' is-playing' : isSelected ? ' is-selected' : ''}`}
            >
                {/* Logo */}
                <ChannelLogo src={channel.logo} name={channel.name} size={34} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {isPlaying && (
                            <Radio
                                size={9}
                                style={{ color: 'var(--accent)', flexShrink: 0, animation: 'pulse 2s infinite' }}
                            />
                        )}
                        <p
                            style={{
                                fontFamily: 'Outfit, sans-serif',
                                fontSize: 13,
                                fontWeight: isPlaying ? 600 : 500,
                                color: isPlaying ? 'var(--accent)' : 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {channel.name}
                        </p>
                    </div>
                    <p
                        style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: 1,
                        }}
                    >
                        {channel.group}
                    </p>
                </div>

                {/* Favorite star */}
                <button
                    onClick={handleFavClick}
                    style={{
                        padding: 4,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: isFavorite ? '#FBBF24' : 'var(--text-muted)',
                        opacity: isFavorite ? 1 : 0,
                        flexShrink: 0,
                        transition: 'opacity 0.15s',
                    }}
                    className="group-hover-show"
                >
                    <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
            </div>
        );
    },
    (prev, next) =>
        prev.channel.id === next.channel.id &&
        prev.isSelected === next.isSelected &&
        prev.isPlaying === next.isPlaying &&
        prev.isFavorite === next.isFavorite &&
        prev.index === next.index,
);
