import React, { memo, useCallback, useMemo, useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useChannelStore } from '../../store/channelStore';
import { Eye, EyeOff, Search } from 'lucide-react';

export const ContentSettings = memo(function ContentSettings() {
    const { contentSettings, updateContentSettings } = useSettingsStore();
    const { allGroups } = useChannelStore();
    const [searchQuery, setSearchQuery] = useState('');

    const handleHideAdultChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateContentSettings({ hideAdult: e.target.checked });
    }, [updateContentSettings]);

    const toggleCategory = useCallback((group: string) => {
        const isHidden = contentSettings.hiddenCategories.includes(group);
        if (isHidden) {
            updateContentSettings({
                hiddenCategories: contentSettings.hiddenCategories.filter(g => g !== group)
            });
        } else {
            updateContentSettings({
                hiddenCategories: [...contentSettings.hiddenCategories, group]
            });
        }
    }, [contentSettings.hiddenCategories, updateContentSettings]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return allGroups;
        const q = searchQuery.toLowerCase();
        return allGroups.filter((g: string) => g.toLowerCase().includes(q));
    }, [allGroups, searchQuery]);

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-sm font-semibold text-white mb-3">İçerik ve Ebeveyn Kontrolleri</h3>
            </div>

            {/* Safe Mode */}
            <div className="flex items-center justify-between p-3 bg-dark-800/30 border border-dark-700/50 rounded-lg">
                <div>
                    <label className="text-sm text-white font-medium block">Yetişkin İçerik Filtresi (Güvenli Mod)</label>
                    <span className="text-[10px] text-dark-400">Başlığında Adult, 18+ veya XXX geçen kanal ve kategorileri gizler.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={contentSettings.hideAdult}
                        onChange={handleHideAdultChange}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                </label>
            </div>

            {/* Hidden Categories - Interactive UI */}
            <div className="flex flex-col flex-1 min-h-[300px] border border-dark-700/50 rounded-lg overflow-hidden bg-dark-900/50">
                <div className="p-3 border-b border-dark-700/50 bg-dark-800/30 flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-white block mb-0.5">Kategori Görünürlüğü</label>
                        <span className="text-[10px] text-dark-400">Gizlenenler kanal listesinde gösterilmez ({contentSettings.hiddenCategories.length} kategori gizli)</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-3 py-2 border-b border-dark-700/30 bg-dark-800/10">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                        <input
                            type="text"
                            placeholder="Kategori Ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-dark-800 text-xs text-white rounded-md border border-dark-700/50 outline-none focus:border-accent-500/50"
                        />
                    </div>
                </div>

                {/* Categories List */}
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar max-h-[350px]">
                    {allGroups.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-dark-400">
                            <EyeOff size={24} className="mb-2 opacity-50" />
                            <span className="text-xs">Henüz taranan bir grup yok. M3U listenizin tamamen yüklendiğinden emin olun.</span>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="w-full py-4 text-center text-xs text-dark-400">Böyle bir kategori bulunamadı.</div>
                    ) : (
                        filteredGroups.map((group: string) => {
                            const isHidden = contentSettings.hiddenCategories.includes(group);
                            return (
                                <button
                                    key={group}
                                    onClick={() => toggleCategory(group)}
                                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors border border-transparent 
                                        ${isHidden
                                            ? 'bg-red-900/10 border-red-900/30 text-dark-500 hover:bg-red-900/20'
                                            : 'bg-dark-800/30 hover:bg-dark-800 text-dark-200 hover:text-white'
                                        }`}
                                >
                                    <span className="text-xs text-left truncate pr-4">{group}</span>
                                    {isHidden ? (
                                        <EyeOff size={16} className="text-red-400 shrink-0" />
                                    ) : (
                                        <Eye size={16} className="text-accent-500 shrink-0" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
});
