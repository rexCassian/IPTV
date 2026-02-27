import React, { memo, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Layers, ChevronRight } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';

export const CategoryList = memo(function CategoryList() {
    const { channels, groups, setFilter } = useChannelStore();
    const parentRef = useRef<HTMLDivElement>(null);

    // Count channels per group
    const groupCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const ch of channels) {
            counts.set(ch.group, (counts.get(ch.group) || 0) + 1);
        }
        return counts;
    }, [channels]);

    const virtualizer = useVirtualizer({
        count: groups.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 52,
        overscan: 8,
    });

    if (groups.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 8, padding: 24 }}>
                <Layers size={32} style={{ opacity: 0.4 }} />
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, textAlign: 'center' }}>
                    Kategori bulunamadı.<br />Önce bir M3U kaynağı yükleyin.
                </p>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className="channel-scroll"
            style={{ height: '100%', overflowY: 'auto' }}
        >
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                {virtualizer.getVirtualItems().map((vRow) => {
                    const group = groups[vRow.index];
                    const count = groupCounts.get(group) || 0;

                    return (
                        <div
                            key={vRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: vRow.size,
                                transform: `translateY(${vRow.start}px)`,
                            }}
                        >
                            <button
                                onClick={() => setFilter({ group })}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '8px 12px 8px 10px',
                                    margin: '1px 6px',
                                    borderRadius: 10,
                                    border: '1px solid transparent',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.15s ease, border-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)';
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                                }}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,212,255,0.1))',
                                    border: '1px solid rgba(108,99,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Layers size={15} style={{ color: 'var(--accent)' }} />
                                </div>

                                {/* Name & Count */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: 'var(--text-primary)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {group}
                                    </p>
                                    <p style={{
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: 11,
                                        color: 'var(--accent)',
                                        marginTop: 1,
                                    }}>
                                        {count.toLocaleString('tr-TR')} kanal
                                    </p>
                                </div>

                                {/* Arrow */}
                                <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
