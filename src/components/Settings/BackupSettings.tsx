import React, { memo, useState, useCallback } from 'react';
import { Download, Upload, Trash2, CheckCircle2 } from 'lucide-react';

export const BackupSettings = memo(function BackupSettings() {
    const [statusText, setStatusText] = useState<string | null>(null);

    const handleExport = useCallback(async () => {
        try {
            const success = await window.electronAPI.settings.exportData();
            if (success) {
                setStatusText('Ayarlar başarıyla dışa aktarıldı.');
                setTimeout(() => setStatusText(null), 3000);
            }
        } catch (e: any) {
            setStatusText(`Dışa aktarma hatası: ${e.message}`);
        }
    }, []);

    const handleImport = useCallback(async () => {
        try {
            const success = await window.electronAPI.settings.importData();
            if (success) {
                setStatusText('Ayarlar içe aktarıldı. Uygulama yenilenecek...');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (e: any) {
            setStatusText(`İçe aktarma hatası: ${e.message}`);
        }
    }, []);

    const handleClearDb = useCallback(async () => {
        if (window.confirm('EPG veritabanını temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
            try {
                await window.electronAPI.epg.clearDatabase();
                setStatusText('EPG Veritabanı temizlendi.');
                setTimeout(() => setStatusText(null), 3000);
            } catch (e: any) {
                setStatusText(`Temizleme hatası: ${e.message}`);
            }
        }
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-semibold text-white mb-3">Veri Yedekleme ve Sıfırlama</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Export */}
                <button
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center p-4 bg-dark-800 border border-dark-700/50 hover:bg-dark-700 hover:border-dark-600 rounded-xl transition-all group"
                >
                    <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center mb-3 group-hover:bg-accent-500/20 transition-colors">
                        <Upload size={18} className="text-accent-500" />
                    </div>
                    <span className="text-sm font-medium text-white mb-1">Dışa Aktar</span>
                    <span className="text-[10px] text-dark-400 text-center">Ayarları ve kaynakları PC'nize yedekleyin</span>
                </button>

                {/* Import */}
                <button
                    onClick={handleImport}
                    className="flex flex-col items-center justify-center p-4 bg-dark-800 border border-dark-700/50 hover:bg-dark-700 hover:border-dark-600 rounded-xl transition-all group"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
                        <Download size={18} className="text-blue-500" />
                    </div>
                    <span className="text-sm font-medium text-white mb-1">İçe Aktar</span>
                    <span className="text-[10px] text-dark-400 text-center">Önceden aldığınız yedeği geri yükleyin</span>
                </button>
            </div>

            <hr className="border-dark-800" />

            {/* Clear Database */}
            <div>
                <label className="block text-xs font-medium text-red-400 mb-2">
                    Tehlikeli İşlemler
                </label>
                <div className="p-4 border border-red-900/30 bg-red-900/10 rounded-lg flex items-center justify-between">
                    <div>
                        <h4 className="text-sm text-red-400 font-medium">EPG Kılavuzunu Sıfırla</h4>
                        <p className="text-[10px] text-red-400/70 mt-0.5">Şişen veya bozulan EPG veritabanını sıfırlamak için kullanılır.</p>
                    </div>
                    <button
                        onClick={handleClearDb}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20 flex items-center gap-2"
                    >
                        <Trash2 size={14} />
                        Sıfırla
                    </button>
                </div>
            </div>

            {/* Status Message */}
            {statusText && (
                <div className="flex items-center gap-2 p-3 bg-accent-500/10 text-accent-400 rounded-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 size={14} />
                    {statusText}
                </div>
            )}
        </div>
    );
});
