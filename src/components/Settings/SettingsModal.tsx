import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Link2, Tv, Settings } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { SourceManager } from './SourceManager';
import { EPGSettings } from './EPGSettings';
import { PlayerSettings } from './PlayerSettings';
import { GeneralSettings } from './GeneralSettings';
import { ContentSettings } from './ContentSettings';
import { BackupSettings } from './BackupSettings';
import { Shield, HardDrive, MonitorPlay } from 'lucide-react';

type SettingsTab = 'general' | 'sources' | 'epg' | 'player' | 'content' | 'backup';

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'Genel', icon: <Settings size={16} /> },
    { id: 'player', label: 'Oynatıcı', icon: <MonitorPlay size={16} /> },
    { id: 'sources', label: 'Kaynaklar', icon: <FolderOpen size={16} /> },
    { id: 'epg', label: 'EPG Ayarları', icon: <Link2 size={16} /> },
    { id: 'content', label: 'İçerik Filtreleri', icon: <Shield size={16} /> },
    { id: 'backup', label: 'Yedekleme & Sıfırlama', icon: <HardDrive size={16} /> },
];

export const SettingsModal = memo(function SettingsModal() {
    const { closeModal } = useUiStore();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
                className="w-[800px] max-h-[90vh] bg-dark-900 rounded-xl border border-dark-700/50 shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-dark-800/50">
                    <div className="flex items-center gap-2">
                        <Settings size={18} className="text-accent-500" />
                        <h2 className="text-lg font-semibold text-white">Ayarlar</h2>
                    </div>
                    <button
                        onClick={closeModal}
                        className="p-1.5 text-dark-400 hover:text-white transition-colors rounded-lg hover:bg-dark-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-dark-800/50 overflow-x-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2
                ${activeTab === tab.id
                                    ? 'text-accent-400 border-accent-500 bg-dark-800/50'
                                    : 'text-dark-400 border-transparent hover:text-white hover:border-dark-600 hover:bg-dark-800/30'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'general' && (
                            <motion.div key="general" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                                <GeneralSettings />
                            </motion.div>
                        )}
                        {activeTab === 'sources' && (
                            <motion.div key="sources" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                                <SourceManager />
                            </motion.div>
                        )}
                        {activeTab === 'epg' && (
                            <motion.div key="epg" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                                <EPGSettings />
                            </motion.div>
                        )}
                        {activeTab === 'player' && (
                            <motion.div key="player" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                                <PlayerSettings />
                            </motion.div>
                        )}
                        {activeTab === 'content' && (
                            <motion.div key="content" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                                <ContentSettings />
                            </motion.div>
                        )}
                        {activeTab === 'backup' && (
                            <motion.div key="backup" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                                <BackupSettings />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
});
