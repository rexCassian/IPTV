import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    channelName?: string | null;
    buffering?: boolean;
}

export const LoadingOverlay = memo(function LoadingOverlay({ channelName, buffering }: LoadingOverlayProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
            <div className="flex flex-col items-center gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader2 size={40} className="text-accent-500" />
                </motion.div>
                <div className="text-center">
                    <p className="text-white font-medium text-sm">
                        {buffering ? 'Tamponlanıyor...' : 'Yükleniyor...'}
                    </p>
                    {channelName && (
                        <p className="text-dark-400 text-xs mt-1">{channelName}</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
});
