import React, { memo, useCallback } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export const PlayerSettings = memo(function PlayerSettings() {
    const { playerSettings, updatePlayerSettings, volume, setVolume } = useSettingsStore();

    const handleHwdecChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            updatePlayerSettings({ hwdec: e.target.value });
        },
        [updatePlayerSettings],
    );

    const handleCacheChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1 && val <= 30) {
                updatePlayerSettings({ cacheSecs: val });
            }
        },
        [updatePlayerSettings],
    );

    const handleBufferChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            updatePlayerSettings({ bufferSize: e.target.value });
        },
        [updatePlayerSettings],
    );

    const handleEngineOverrideChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            updatePlayerSettings({ engineOverride: e.target.value as any });
        },
        [updatePlayerSettings],
    );

    const handleTimeSkipChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            updatePlayerSettings({ timeSkipSecs: parseInt(e.target.value, 10) });
        },
        [updatePlayerSettings],
    );

    const handleAudioDelayChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            updatePlayerSettings({ audioDelay: parseInt(e.target.value, 10) });
        },
        [updatePlayerSettings],
    );

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-sm font-semibold text-white mb-3">Oynatıcı Ayarları</h3>
            </div>

            {/* Default Volume */}
            <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Varsayılan Ses Seviyesi: {volume}%
                </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-dark-700 rounded-full appearance-none cursor-pointer accent-accent-500"
                />
            </div>

            {/* Engine Override */}
            <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Varsayılan Oynatıcı Motoru
                </label>
                <select
                    value={playerSettings.engineOverride}
                    onChange={handleEngineOverrideChange}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white
            focus:outline-none focus:border-accent-500/50"
                >
                    <option value="auto">Otomatik Mimariler</option>
                    <option value="mpv">Daima MPV Motoru (Performans)</option>
                    <option value="mpegts">Daima Tarayıcı HTML5 (Web uyumluluğu)</option>
                </select>
            </div>

            {/* Hardware Decode */}
            <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Donanım Hızlandırma (mpv)
                </label>
                <select
                    value={playerSettings.hwdec}
                    onChange={handleHwdecChange}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white
            focus:outline-none focus:border-accent-500/50"
                >
                    <option value="d3d11va">Direct3D 11 (Önerilen)</option>
                    <option value="dxva2">DXVA2</option>
                    <option value="auto">Otomatik</option>
                    <option value="no">Kapalı (CPU)</option>
                </select>
            </div>

            {/* Cache Duration */}
            <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Önbellek Süresi: {playerSettings.cacheSecs}sn
                </label>
                <input
                    type="range"
                    min="2"
                    max="20"
                    value={playerSettings.cacheSecs}
                    onChange={handleCacheChange}
                    className="w-full h-1.5 bg-dark-700 rounded-full appearance-none cursor-pointer accent-accent-500"
                />
                <div className="flex justify-between text-[10px] text-dark-500 mt-0.5">
                    <span>2sn (düşük gecikme)</span>
                    <span>20sn (kararlı)</span>
                </div>
            </div>

            {/* Buffer Size */}
            <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                    Tampon Boyutu
                </label>
                <select
                    value={playerSettings.bufferSize}
                    onChange={handleBufferChange}
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white
            focus:outline-none focus:border-accent-500/50"
                >
                    <option value="16MiB">16 MB (Düşük RAM)</option>
                    <option value="32MiB">32 MB (Önerilen)</option>
                    <option value="64MiB">64 MB (Yüksek kalite)</option>
                    <option value="128MiB">128 MB (4K içerik)</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Time Skip Interval */}
                <div>
                    <label className="block text-xs font-medium text-dark-300 mb-1.5">
                        Sarma Süresi
                    </label>
                    <select
                        value={playerSettings.timeSkipSecs}
                        onChange={handleTimeSkipChange}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-accent-500/50"
                    >
                        <option value="5">5 Saniye</option>
                        <option value="10">10 Saniye (Varsayılan)</option>
                        <option value="15">15 Saniye</option>
                        <option value="30">30 Saniye</option>
                    </select>
                </div>

                {/* Audio Delay */}
                <div>
                    <label className="block text-xs font-medium text-dark-300 mb-1.5">
                        Ses Gecikmesi (Senkron)
                    </label>
                    <div className="flex items-center bg-dark-800 border border-dark-700/50 rounded-lg pr-3">
                        <input
                            type="number"
                            value={playerSettings.audioDelay}
                            onChange={handleAudioDelayChange}
                            className="w-full px-3 py-2 bg-transparent text-sm text-white focus:outline-none"
                        />
                        <span className="text-xs text-dark-400">ms</span>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-dark-800/30 rounded-lg border border-dark-700/30">
                <p className="text-xs text-dark-400">
                    ⚠️ mpv ayarları yalnızca HLS (m3u8) akışları için geçerlidir.
                    MPEG-TS akışları tarayıcı içi HTML5 video oynatıcı kullanır.
                </p>
            </div>
        </div>
    );
});
