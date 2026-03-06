import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Star } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useChannelStore } from '../../store/channelStore';
import { SearchBar } from './SearchBar';
import { CategoryTabs } from './CategoryTabs';
import { MainTabBar } from './MainTabBar';
import { LiveView } from './LiveView';
import { MoviesView } from './MoviesView';
import { SeriesView } from './SeriesView';

export const Sidebar = memo(function Sidebar() {
    const { sidebarCollapsed, sidebarWidth } = useUiStore();
    const {
        channels, filteredChannels, groups,
        isLoading, loadProgress, filter, setFilter,
        activeMainTab, liveCount, movieCount, seriesCount,
    } = useChannelStore();

    // In live tab, show category list when no filter active
    const liveShowingCategories = activeMainTab === 'live' && !filter.group && !filter.search && !filter.favorites;

    // Show CategoryTabs only in live tab when inside a category
    const showCategoryTabs = activeMainTab === 'live' && !!filter.group;

    // Show back button in movie/series tabs when search active
    const showFilterBreadcrumb = (activeMainTab !== 'live') && (filter.search);

    // Stats for stats row
    const activeCount =
        activeMainTab === 'live' ? liveCount :
            activeMainTab === 'movie' ? movieCount :
                seriesCount;

    return (
        <AnimatePresence>
            {!sidebarCollapsed && (
                <motion.aside
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: sidebarWidth, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="sidebar-glass"
                    style={{ width: sidebarWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                    {/* ── Main 3-tab bar ── */}
                    <MainTabBar />

                    {/* ── Search ── */}
                    <div style={{ padding: '8px 10px', borderBottom: 'none' }}>
                        <SearchBar />
                    </div>

                    {/* ── Global Favorites Filter Toggle ── */}
                    <div style={{ padding: '0 10px 8px', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => setFilter({ favorites: !filter.favorites })}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', borderRadius: 8,
                                background: filter.favorites ? 'rgba(251,191,36,0.15)' : 'var(--glass-bg)',
                                border: '1px solid',
                                borderColor: filter.favorites ? 'rgba(251,191,36,0.4)' : 'var(--glass-border)',
                                color: filter.favorites ? '#FBBF24' : 'var(--text-secondary)',
                                fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: filter.favorites ? 500 : 400,
                                cursor: 'pointer', transition: 'all 0.2s', flex: 1, justifyContent: 'center'
                            }}
                        >
                            <Star size={13} fill={filter.favorites ? 'currentColor' : 'none'} />
                            Favoriler
                        </button>
                    </div>

                    {/* ── Live: category breadcrumb when inside a group ── */}
                    {activeMainTab === 'live' && filter.group && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 10px', borderBottom: '1px solid var(--glass-border)',
                            background: 'rgba(34,197,94,0.06)', flexShrink: 0,
                        }}>
                            <button
                                onClick={() => setFilter({ group: null })}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px', borderRadius: 6,
                                    border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                                    color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif', fontSize: 11, cursor: 'pointer',
                                }}
                            >
                                <ChevronLeft size={12} /> Kategoriler
                            </button>
                            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 600, color: '#22C55E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {filter.group}
                            </p>
                        </div>
                    )}



                    {/* ── CategoryTabs — shown in live tab when inside a group ── */}
                    {showCategoryTabs && <CategoryTabs />}

                    {/* ── Loading bar ── */}
                    {isLoading && (
                        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>Yükleniyor...</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--accent)' }}>
                                    {loadProgress.loaded.toLocaleString('tr-TR')}
                                </span>
                            </div>
                            <div style={{ height: 2, background: 'var(--glass-bg-active)', borderRadius: 2, overflow: 'hidden' }}>
                                <motion.div
                                    style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }}
                                    initial={{ width: '0%' }}
                                    animate={{ width: loadProgress.total > 0 ? `${Math.min(100, (loadProgress.loaded / loadProgress.total) * 100)}%` : '40%' }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Stats row ── */}
                    <div className="stats-row">
                        {liveShowingCategories ? (
                            <>
                                <span className="stats-count"><span className="stats-number">{groups.length}</span> kategori</span>
                                <span className="stats-divider">·</span>
                                <span className="stats-count"><span className="stats-number">{activeCount.toLocaleString('tr-TR')}</span> canlı kanal</span>
                            </>
                        ) : (
                            <>
                                <span className="stats-count">
                                    <span className="stats-number">{filteredChannels.length.toLocaleString('tr-TR')}</span>
                                    {activeMainTab === 'live' ? ' kanal' : activeMainTab === 'movie' ? ' film' : ' dizi bölümü'}
                                </span>
                                {channels.length !== filteredChannels.length && (
                                    <>
                                        <span className="stats-divider">·</span>
                                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
                                            {activeCount.toLocaleString('tr-TR')} toplam
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {/* ── Main content area ── */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        {activeMainTab === 'live' && <LiveView />}
                        {activeMainTab === 'movie' && <MoviesView />}
                        {activeMainTab === 'series' && <SeriesView />}
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
});
