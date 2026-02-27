import React, { memo, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useChannelStore } from '../../store/channelStore';
import { usePlayerStore } from '../../store/playerStore';
import { ChannelItem } from './ChannelItem';
import type { Channel } from '../../types/channel';

interface ChannelListProps {
    onChannelSelect?: (channel: Channel) => void;
}

export const ChannelList = memo(function ChannelList({ onChannelSelect }: ChannelListProps) {
    const { filteredChannels, selectedIndex, setSelectedIndex, favorites } = useChannelStore();
    const { currentChannel } = usePlayerStore();
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: filteredChannels.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 56,
        overscan: 10,
    });

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && selectedIndex < filteredChannels.length) {
            virtualizer.scrollToIndex(selectedIndex, { align: 'auto', behavior: 'auto' });
        }
    }, [selectedIndex, filteredChannels.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSelect = useCallback(
        (index: number) => {
            setSelectedIndex(index);
        },
        [setSelectedIndex],
    );

    if (filteredChannels.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-dark-500 px-6">
                <p className="text-sm font-medium mb-1">Kanal bulunamadı</p>
                <p className="text-xs text-center">
                    Arama kriterlerinizi değiştirin veya ayarlardan bir M3U kaynağı ekleyin
                </p>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className="h-full overflow-auto scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent"
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const channel = filteredChannels[virtualRow.index];
                    const isSelected = virtualRow.index === selectedIndex;
                    const isPlaying = currentChannel?.id === channel.id;
                    const isFavorite = favorites.has(channel.id);

                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <ChannelItem
                                channel={channel}
                                isSelected={isSelected}
                                isPlaying={isPlaying}
                                isFavorite={isFavorite}
                                index={virtualRow.index}
                                onSelect={handleSelect}
                                onPlay={onChannelSelect}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
