import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import { formatBitrate, formatResolution } from '../../utils/timeFormatter';

export const StreamInfo = memo(function StreamInfo() {
    const { codec, width, height, fps, bitrate, engine } = usePlayerStore();

    const resolution = formatResolution(width, height);
    const bitrateStr = bitrate > 0 ? formatBitrate(bitrate) : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-3 right-3 z-30 bg-dark-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs font-mono"
        >
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-dark-400">Motor:</span>
                    <span className="text-accent-400 uppercase">{engine}</span>
                </div>
                {codec && (
                    <div className="flex items-center gap-2">
                        <span className="text-dark-400">Codec:</span>
                        <span className="text-white">{codec}</span>
                    </div>
                )}
                {resolution && (
                    <div className="flex items-center gap-2">
                        <span className="text-dark-400">Çözünürlük:</span>
                        <span className="text-white">{resolution}</span>
                    </div>
                )}
                {fps > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-dark-400">FPS:</span>
                        <span className="text-white">{fps}</span>
                    </div>
                )}
                {bitrateStr && (
                    <div className="flex items-center gap-2">
                        <span className="text-dark-400">Bitrate:</span>
                        <span className="text-white">{bitrateStr}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
});
