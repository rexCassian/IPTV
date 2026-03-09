import React, { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Tv, Film, Clapperboard } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';
import { useUiStore } from '../../store/uiStore';
import { playChannelByIndex } from '../../utils/playerActions';

export const SpotlightSearch = memo(function SpotlightSearch() {
    const { filter, setFilter, filteredChannels, activeMainTab } = useChannelStore();
    const { isSearchActive, setSearchActive } = useUiStore();
    const [localValue, setLocalValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync from store filter when opened
    useEffect(() => {
        if (isSearchActive) {
            setLocalValue(filter.search || '');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isSearchActive]);

    const handleClose = () => {
        setSearchActive(false);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        setFilter({ search: val });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleClose();
        } else if (e.key === 'Enter' && filteredChannels.length > 0) {
            playChannelByIndex(0);
            handleClose();
        }
    };

    return (
        <AnimatePresence>
            {isSearchActive && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                        className="relative w-full max-w-2xl bg-dark-900/90 border border-glass-border shadow-2xl rounded-2xl overflow-hidden flex flex-col backdrop-blur-xl"
                    >
                        <div className="flex items-center px-4 py-4 border-b border-glass-border gap-3">
                            <Search className="text-accent-500" size={24} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={localValue}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Film, Dizi veya Kanal ara..."
                                className="flex-1 bg-transparent border-none text-xl text-white placeholder-dark-400 focus:outline-none"
                            />
                            {localValue && (
                                <button
                                    onClick={() => {
                                        setLocalValue('');
                                        setFilter({ search: '' });
                                        inputRef.current?.focus();
                                    }}
                                    className="p-1 text-dark-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {localValue && (
                            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col p-2 space-y-1">
                                {filteredChannels.length === 0 ? (
                                    <div className="py-12 text-center text-dark-400 font-medium">Sonuç bulunamadı.</div>
                                ) : (
                                    filteredChannels.slice(0, 20).map((chan, idx) => (
                                        <button
                                            key={`${chan.id}-${idx}`}
                                            onClick={() => {
                                                playChannelByIndex(idx);
                                                handleClose();
                                            }}
                                            className="flex items-center gap-3 w-full text-left p-3 hover:bg-white/5 rounded-xl transition-colors group"
                                        >
                                            {/* Icon Type */}
                                            <div className="w-10 h-10 rounded-lg bg-dark-800/50 flex items-center justify-center text-dark-300 group-hover:text-accent-400 group-hover:bg-accent-500/10">
                                                {activeMainTab === 'live' ? <Tv size={20} /> : activeMainTab === 'movie' ? <Film size={20} /> : <Clapperboard size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{chan.name}</p>
                                                <p className="text-xs text-dark-400 truncate">{chan.group}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        <div className="px-4 py-2 border-t border-glass-border/50 text-[10px] text-dark-400 flex items-center justify-between">
                            <span>Sonuçlar <b>{activeMainTab === 'live' ? 'Canlı Yayınlar' : activeMainTab === 'movie' ? 'Filmler' : 'Diziler'}</b> kategorisinden filtreleniyor</span>
                            <div className="flex gap-2">
                                <span><kbd className="bg-dark-800 border border-dark-700 px-1 rounded-sm font-sans mx-1">↑↓</kbd> Gezin</span>
                                <span><kbd className="bg-dark-800 border border-dark-700 px-1 rounded-sm font-sans mx-1">Enter</kbd> Oynat</span>
                                <span><kbd className="bg-dark-800 border border-dark-700 px-1 rounded-sm font-sans mx-1">ESC</kbd> Kapat</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
