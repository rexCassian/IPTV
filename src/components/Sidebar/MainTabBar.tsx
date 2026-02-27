import React, { memo, useCallback } from 'react';
import { Radio, Film, Tv } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';
import type { MainTab } from '../../types/content';

interface TabConfig {
    id: MainTab;
    label: string;
    Icon: any;
    color: string;
    glow: string;
    countKey: 'liveCount' | 'movieCount' | 'seriesCount';
}

const TABS: TabConfig[] = [
    { id: 'live', label: 'Canlı', Icon: Radio, color: '#22C55E', glow: 'rgba(34,197,94,0.25)', countKey: 'liveCount' },
    { id: 'movie', label: 'Filmler', Icon: Film, color: '#F59E0B', glow: 'rgba(245,158,11,0.25)', countKey: 'movieCount' },
    { id: 'series', label: 'Diziler', Icon: Tv, color: '#6C63FF', glow: 'rgba(108,99,255,0.25)', countKey: 'seriesCount' },
];

function fmt(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
}

export const MainTabBar = memo(function MainTabBar() {
    const { activeMainTab, setActiveMainTab, liveCount, movieCount, seriesCount } = useChannelStore();

    const counts = { liveCount, movieCount, seriesCount };

    return (
        <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(0,0,0,0.2)',
            flexShrink: 0,
        }}>
            {TABS.map(({ id, label, Icon, color, glow, countKey }) => {
                const active = activeMainTab === id;
                const count = counts[countKey];
                return (
                    <button
                        key={id}
                        onClick={() => setActiveMainTab(id)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 3,
                            padding: '9px 4px 7px',
                            border: 'none',
                            background: active
                                ? `linear-gradient(180deg, ${glow} 0%, transparent 100%)`
                                : 'transparent',
                            borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s ease',
                        }}
                    >
                        <Icon size={15} style={{ color: active ? color : 'var(--text-muted)' }} />
                        <span style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 12,
                            fontWeight: active ? 600 : 400,
                            color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                            lineHeight: 1,
                        }}>
                            {label}
                        </span>
                        <span style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 10,
                            color: active ? color : 'var(--text-muted)',
                            lineHeight: 1,
                        }}>
                            {count > 0 ? fmt(count) : '—'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
});
