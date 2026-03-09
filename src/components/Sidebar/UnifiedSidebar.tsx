import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useChannelStore } from '../../store/channelStore';
import { Tv, Film, Clapperboard, Star, Settings, Search, Calendar, User, ChevronLeft } from 'lucide-react';
import type { MainTab } from '../../types/content';
import { LiveView } from './LiveView';
import { MoviesView } from './MoviesView';
import { SeriesView } from './SeriesView';

export const UnifiedSidebar = memo(function UnifiedSidebar() {
    const { sidebarCollapsed, setSidebarCollapsed, setSearchActive } = useUiStore();
    const { activeMainTab, setActiveMainTab, filter, setFilter, isLoading, loadProgress } = useChannelStore();
    const loadPercentage = loadProgress.total > 0 ? Math.round((loadProgress.loaded / loadProgress.total) * 100) : 0;

    const navItems = [
        { id: 'live', icon: Tv, label: 'Canlı' },
        { id: 'movie', icon: Film, label: 'Filmler' },
        { id: 'series', icon: Clapperboard, label: 'Diziler' }
    ];

    return (
        <div className="absolute top-4 left-4 bottom-4 z-[60] flex drop-shadow-[0_0_40px_rgba(0,0,0,0.4)] pointer-events-none">
            <AnimatePresence>
                {!sidebarCollapsed && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 380, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        className="flex bg-dark-900/80 backdrop-blur-3xl border border-white/10 rounded-[28px] overflow-hidden pointer-events-auto h-full shrink-0"
                    >
                        <div className="w-[380px] h-full flex flex-col">
                            {/* Horizontal Navigation Header */}
                            <div className="flex items-center justify-between px-6 pt-7 pb-4 shrink-0 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    {navItems.map((item) => {
                                        const Icon = item.icon;
                                        let isActive = activeMainTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveMainTab(item.id as MainTab);
                                                    setFilter({ favorites: false });
                                                }}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive ? 'bg-white text-dark-950 shadow-md scale-105' : 'text-dark-300 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                                <span className="font-semibold text-[13px]">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => setFilter({ favorites: !filter.favorites })}
                                        className={`p-2 rounded-full transition-colors ${filter.favorites ? 'text-accent-400 bg-accent-400/20' : 'text-dark-400 hover:bg-white/10 hover:text-white'}`}
                                        title="Favoriler"
                                    >
                                        <Star size={18} fill={filter.favorites ? 'currentColor' : 'none'} strokeWidth={filter.favorites ? 0 : 2} />
                                    </button>
                                    <button
                                        onClick={() => setSearchActive(true)}
                                        className="p-2 rounded-full text-dark-400 hover:bg-white/10 hover:text-white transition-colors"
                                        title="Arama (Ctrl+F)"
                                    >
                                        <Search size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Breadcrumbs for Categories */}
                            {(activeMainTab === 'live' || activeMainTab === 'series') && filter.group && !filter.favorites && (
                                <div className="px-6 mb-2">
                                    <button
                                        onClick={() => setFilter({ group: null })}
                                        className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors text-sm font-medium"
                                    >
                                        <ChevronLeft size={16} />
                                        {activeMainTab === 'live' ? 'Kategoriler' : 'Diziler'}
                                    </button>
                                </div>
                            )}

                            {/* Minimal Loading Bar */}
                            {isLoading && (
                                <div className="px-6 py-2 shrink-0 bg-dark-950/40">
                                    <div className="flex justify-between mb-1.5">
                                        <span className="text-[10px] text-dark-400 font-medium">Güncelleniyor...</span>
                                        <span className="text-[10px] text-accent-400 font-bold">{loadPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-dark-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-accent-600 to-accent-400" style={{ width: `${loadPercentage}%`, transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-hidden relative pb-4">
                                {activeMainTab === 'live' && <LiveView />}
                                {activeMainTab === 'movie' && <MoviesView />}
                                {activeMainTab === 'series' && <SeriesView />}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
});
