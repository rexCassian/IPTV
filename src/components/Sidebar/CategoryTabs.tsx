import React, { memo, useRef, useCallback, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Star, Globe, X } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';

export const CategoryTabs = memo(function CategoryTabs() {
    const { groups, filter, setFilter } = useChannelStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const [catSearch, setCatSearch] = useState('');
    const [showCatSearch, setShowCatSearch] = useState(false);

    const filteredGroups = catSearch.trim()
        ? groups.filter((g) => g.toLowerCase().includes(catSearch.toLowerCase()))
        : groups;

    /* ── Arrow visibility ── */
    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', checkScroll, { passive: true });
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
    }, [checkScroll, filteredGroups.length]);

    /* ── Auto-scroll active tab ── */
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !filter.group) return;
        const activeEl = el.querySelector('[data-active="true"]') as HTMLElement | null;
        activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [filter.group]);

    const scroll = useCallback((dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'left' ? -180 : 180, behavior: 'smooth' });
    }, []);

    const handleGroupClick = useCallback((group: string | null) => {
        setFilter({ group: filter.group === group ? null : group });
    }, [filter.group, setFilter]);

    const handleFavClick = useCallback(() => {
        setFilter({ favorites: !filter.favorites });
    }, [filter.favorites, setFilter]);

    return (
        <div>
            {/* Category search row */}
            {showCatSearch && groups.length > 10 && (
                <div style={{ padding: '6px 8px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                            size={12}
                            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                        />
                        <input
                            autoFocus
                            className="category-search-input"
                            type="text"
                            value={catSearch}
                            onChange={(e) => setCatSearch(e.target.value)}
                            placeholder="Kategori ara..."
                        />
                    </div>
                    <button
                        style={{ padding: 4, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => { setShowCatSearch(false); setCatSearch(''); }}
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* Tab row */}
            <div className="category-tabs-wrapper">
                {/* Left arrow */}
                <button
                    className="category-scroll-btn"
                    onClick={() => scroll('left')}
                    disabled={!canLeft}
                    aria-label="Sola kaydır"
                >
                    <ChevronLeft size={13} />
                </button>

                {/* Scrollable tabs */}
                <div className="category-tabs-scroll" ref={scrollRef}>
                    {/* Favorites */}
                    <button
                        className={`category-tab${filter.favorites ? ' active' : ''}`}
                        data-active={filter.favorites}
                        onClick={handleFavClick}
                    >
                        <Star size={11} /> Favoriler
                    </button>

                    {/* All */}
                    <button
                        className={`category-tab${!filter.group && !filter.favorites ? ' active' : ''}`}
                        data-active={!filter.group && !filter.favorites}
                        onClick={() => handleGroupClick(null)}
                    >
                        <Globe size={11} /> Tümü
                    </button>

                    {/* Separator */}
                    <div style={{ width: 1, height: 18, background: 'var(--glass-border)', flexShrink: 0, alignSelf: 'center' }} />

                    {/* Search trigger */}
                    {groups.length > 10 && !showCatSearch && (
                        <button
                            className="category-tab"
                            onClick={() => setShowCatSearch(true)}
                            title="Kategori ara"
                        >
                            <Search size={11} />
                        </button>
                    )}

                    {/* Group buttons */}
                    {filteredGroups.map((group) => (
                        <button
                            key={group}
                            className={`category-tab${filter.group === group ? ' active' : ''}`}
                            data-active={filter.group === group}
                            onClick={() => handleGroupClick(group)}
                        >
                            {group}
                        </button>
                    ))}

                    {catSearch && filteredGroups.length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, padding: '0 8px', alignSelf: 'center', flexShrink: 0 }}>
                            Bulunamadı
                        </span>
                    )}
                </div>

                {/* Right arrow */}
                <button
                    className="category-scroll-btn"
                    onClick={() => scroll('right')}
                    disabled={!canRight}
                    aria-label="Sağa kaydır"
                >
                    <ChevronRight size={13} />
                </button>
            </div>
        </div>
    );
});
