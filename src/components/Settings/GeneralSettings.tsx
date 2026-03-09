import React, { memo, useCallback } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export const GeneralSettings = memo(function GeneralSettings() {
    const { uiSettings, updateUiSettings } = useSettingsStore();

    const handleStartupViewChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        updateUiSettings({ startupView: e.target.value as any });
    }, [updateUiSettings]);

    const handleThemeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        updateUiSettings({ theme: e.target.value as any });
    }, [updateUiSettings]);

    const handleAnimationsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateUiSettings({ reduceAnimations: e.target.checked });
    }, [updateUiSettings]);

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-sm font-semibold text-white mb-3">Genel ve Arayüz Ayarları</h3>
            </div>

            {/* Startup View */}
            <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Başlangıç Ekranı
                </label>
                <select
                    value={uiSettings.startupView}
                    onChange={handleStartupViewChange}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-accent-500/50"
                >
                    <option value="live">Canlı TV</option>
                    <option value="movies">Filmler</option>
                    <option value="series">Diziler</option>
                    <option value="favorites">Favoriler</option>
                </select>
                <p className="text-[10px] text-dark-400 mt-1">Uygulama açıldığında hangi menünün gösterileceğini belirler.</p>
            </div>

            {/* Theme */}
            <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Tema ve Vurgu Rengi
                </label>
                <select
                    value={uiSettings.theme}
                    onChange={handleThemeChange}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-accent-500/50"
                >
                    <option value="default">Sarı (Coriolis Default)</option>
                    <option value="neon-red">Neon Kırmızı</option>
                    <option value="matrix-green">Matrix Yeşili</option>
                    <option value="midnight-blue">Gece Yarısı Mavisi</option>
                </select>
                <p className="text-[10px] text-dark-400 mt-1">Arayüzdeki ikon, bar ve seçili öğe renklerini ayarlar.</p>
            </div>

            {/* Reduce Animations */}
            <div className="flex items-center justify-between p-3 bg-dark-800/30 border border-dark-700/50 rounded-lg">
                <div>
                    <label className="text-sm text-white font-medium block">Animasyonları Azalt</label>
                    <span className="text-[10px] text-dark-400">Performansı artırmak için görsel geçiş efektlerini kapatır.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={uiSettings.reduceAnimations}
                        onChange={handleAnimationsChange}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-500"></div>
                </label>
            </div>
        </div>
    );
});
