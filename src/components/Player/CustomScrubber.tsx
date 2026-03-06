import React, { useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../../utils/timeFormatter';

interface CustomScrubberProps {
    progress: number;
    duration: number;
    onSeek: (time: number) => void;
    onSeekStart?: () => void;
    onSeekEnd?: () => void;
}

export const CustomScrubber: React.FC<CustomScrubberProps> = ({
    progress,
    duration,
    onSeek,
    onSeekStart,
    onSeekEnd,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // For tooltip
    const [hoverPos, setHoverPos] = useState<number | null>(null);
    const hoverTime = hoverPos !== null ? (hoverPos * duration) : 0;

    const pct = duration > 0 ? (progress / duration) * 100 : 0;

    const updateSeek = useCallback(
        (clientX: number) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            let newPos = (clientX - rect.left) / rect.width;
            newPos = Math.max(0, Math.min(1, newPos));
            onSeek(newPos * duration);
        },
        [duration, onSeek]
    );

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        onSeekStart?.();
        updateSeek(e.clientX);
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let newPos = (e.clientX - rect.left) / rect.width;
        newPos = Math.max(0, Math.min(1, newPos));
        setHoverPos(newPos);

        if (isDragging) {
            onSeek(newPos * duration);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            setIsDragging(false);
            onSeekEnd?.();
            (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        }
    };

    // Calculate formatted time using local logic if formatTime doesn't handle hours properly, or just use it.
    // Assuming formatTime works well. If not, we have a fallback logic.
    const fmt = (secs: number) => {
        if (!isFinite(secs) || secs < 0) return '0:00';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div
            ref={containerRef}
            className="group relative w-full h-6 flex items-center cursor-pointer touch-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setHoverPos(null); }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* Tooltip */}
            <AnimatePresence>
                {(isHovered || isDragging) && hoverPos !== null && duration > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="absolute bottom-full mb-3 -ml-6 px-2 py-1 text-[11px] font-medium text-white bg-dark-900/80 backdrop-blur-md border border-white/10 rounded shadow-lg pointer-events-none tabular-nums"
                        style={{ left: `${hoverPos * 100}%`, fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                        {fmt(hoverTime)}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Track Background */}
            <motion.div
                className="relative w-full rounded-full overflow-hidden bg-white/20"
                animate={{ height: isHovered || isDragging ? 6 : 3 }}
                transition={{ duration: 0.2 }}
            >
                {/* Progress Fill */}
                <div
                    className="absolute top-0 left-0 h-full bg-accent-500 will-change-transform"
                    style={{ width: `${pct}%` }}
                />
            </motion.div>

            {/* Thumb */}
            <motion.div
                className="absolute top-1/2 -mt-2 -ml-2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(108,99,255,0.8)] pointer-events-none"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: isHovered || isDragging ? 1 : 0,
                    opacity: isHovered || isDragging ? 1 : 0
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{ left: `${pct}%` }}
            />
        </div>
    );
};
