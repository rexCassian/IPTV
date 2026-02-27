import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

export const EPGGuide = memo(function EPGGuide() {
    const { closeModal } = useUiStore();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-[90vw] h-[85vh] bg-dark-900 rounded-xl border border-dark-700/50 shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-dark-800/50">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-accent-500" />
                        <h2 className="text-lg font-semibold text-white">EPG Program Rehberi</h2>
                    </div>
                    <button
                        onClick={closeModal}
                        className="p-1.5 text-dark-400 hover:text-white transition-colors rounded-lg hover:bg-dark-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex items-center justify-center text-dark-500">
                    <div className="text-center">
                        <Calendar size={40} className="mx-auto mb-3 text-dark-600" />
                        <p className="text-sm font-medium">EPG Rehberi</p>
                        <p className="text-xs mt-1">
                            EPG URL'si ekleyerek program rehberini görüntüleyebilirsiniz.
                            <br />
                            Ayarlar → EPG Ayarları bölümünden XMLTV URL'si ekleyin.
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
});
