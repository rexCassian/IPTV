import React, { memo, useState, useCallback } from 'react';
import { Plus, Trash2, Download, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useChannelStore } from '../../store/channelStore';

export const SourceManager = memo(function SourceManager() {
    const { m3uSources, addM3uSource, removeM3uSource } = useSettingsStore();
    const { setLoading } = useChannelStore();
    const [newUrl, setNewUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [loadingSource, setLoadingSource] = useState<string | null>(null);

    const handleAdd = useCallback(async () => {
        const url = newUrl.trim();
        if (!url) return;

        setIsAdding(true);
        try {
            await addM3uSource(url);
            setNewUrl('');
            // Auto-load immediately after adding
            await handleLoad(url);
        } finally {
            setIsAdding(false);
        }
    }, [newUrl, addM3uSource]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLoad = useCallback(async (source: string) => {
        setLoadingSource(source);
        setLoading(true);
        try {
            await window.electronAPI.channels.loadSource(source);
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setLoadingSource(null);
        }
    }, [setLoading]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') handleAdd();
        },
        [handleAdd],
    );

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">M3U Kaynakları</h3>
                <p className="text-xs text-dark-400">M3U/M3U8 playlist URL'si veya dosya yolu ekleyin</p>
            </div>

            {/* Add new source */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="http://example.com/playlist.m3u"
                    className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white
            placeholder:text-dark-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20"
                />
                <button
                    onClick={handleAdd}
                    disabled={!newUrl.trim() || isAdding}
                    className="flex items-center gap-1.5 px-3 py-2 bg-accent-600 hover:bg-accent-500 disabled:bg-dark-700 disabled:text-dark-500
            text-white text-sm font-medium rounded-lg transition-colors"
                >
                    {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Ekle
                </button>
            </div>

            {/* Source list */}
            <div className="space-y-2">
                {m3uSources.length === 0 ? (
                    <div className="p-4 text-center text-dark-500 text-xs border border-dashed border-dark-700 rounded-lg">
                        Henüz kaynak eklenmedi. Yukarıdan M3U URL'si ekleyin.
                    </div>
                ) : (
                    m3uSources.map((source, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 p-2.5 bg-dark-800/50 rounded-lg border border-dark-700/30 group"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate font-mono">{source}</p>
                            </div>
                            {/* Load button — always visible */}
                            <button
                                onClick={() => handleLoad(source)}
                                disabled={loadingSource === source}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-accent-600/20 hover:bg-accent-600/40 text-accent-400 hover:text-accent-300 rounded transition-colors disabled:opacity-50"
                                title="Kanalları yükle"
                            >
                                {loadingSource === source ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Download size={12} />
                                )}
                                {loadingSource === source ? 'Yükleniyor...' : 'Yükle'}
                            </button>
                            <button
                                onClick={() => removeM3uSource(source)}
                                className="p-1.5 text-dark-500 hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100"
                                title="Kaynağı sil"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});
