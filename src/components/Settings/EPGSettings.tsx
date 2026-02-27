import React, { memo, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const EPGSettings = memo(function EPGSettings() {
    const { epgUrls, addEpgUrl, removeEpgUrl } = useSettingsStore();
    const [newUrl, setNewUrl] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleAdd = useCallback(() => {
        const url = newUrl.trim();
        if (!url) return;
        addEpgUrl(url);
        setNewUrl('');
    }, [newUrl, addEpgUrl]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await window.electronAPI.epg.forceRefresh();
        } catch (error) {
            console.error('EPG refresh error:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white mb-1">EPG Kaynakları</h3>
                    <p className="text-xs text-dark-400">XMLTV formatında EPG URL'leri ekleyin</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || epgUrls.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-400 hover:text-accent-300
            border border-accent-600/30 rounded-lg hover:bg-accent-600/10 disabled:opacity-50 transition-all"
                >
                    {isRefreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    EPG Yenile
                </button>
            </div>

            {/* Add URL */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="http://example.com/epg.xml"
                    className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white
            placeholder:text-dark-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20"
                />
                <button
                    onClick={handleAdd}
                    disabled={!newUrl.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-accent-600 hover:bg-accent-500 disabled:bg-dark-700 disabled:text-dark-500
            text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Plus size={14} />
                    Ekle
                </button>
            </div>

            {/* URL list */}
            <div className="space-y-2">
                {epgUrls.length === 0 ? (
                    <div className="p-4 text-center text-dark-500 text-xs border border-dashed border-dark-700 rounded-lg">
                        Henüz EPG kaynağı eklenmedi
                    </div>
                ) : (
                    epgUrls.map((url, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 p-2.5 bg-dark-800/50 rounded-lg border border-dark-700/30 group"
                        >
                            <p className="flex-1 text-xs text-white truncate font-mono">{url}</p>
                            <button
                                onClick={() => removeEpgUrl(url)}
                                className="p-1.5 text-dark-400 hover:text-error transition-colors rounded opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 bg-dark-800/30 rounded-lg border border-dark-700/30">
                <p className="text-xs text-dark-400">
                    💡 EPG verisi her 6 saatte otomatik güncellenir. Manuel güncelleme için F5 tuşunu kullanın.
                </p>
            </div>
        </div>
    );
});
