import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';

interface ErrorOverlayProps {
    message: string;
}

export const ErrorOverlay = memo(function ErrorOverlay({ message }: ErrorOverlayProps) {
    const { currentChannel, setStatus, setError } = usePlayerStore();

    const handleRetry = () => {
        if (currentChannel) {
            setError(null);
            setStatus('loading');
            const streamType = currentChannel.url.includes('.m3u8') ? 'hls' : 'mpegts';
            window.electronAPI.player.play(currentChannel.url, streamType);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
            <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
                <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-error" />
                </div>
                <div>
                    <p className="text-white font-medium text-sm mb-1">Yayın Hatası</p>
                    <p className="text-dark-400 text-xs leading-relaxed">{message}</p>
                </div>
                <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <RefreshCw size={14} />
                    Tekrar Dene
                </button>
            </div>
        </motion.div>
    );
});
