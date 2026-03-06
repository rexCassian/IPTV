import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type OSDEvent = {
    id: number;
    icon: React.ReactNode;
    text: string;
    position?: 'center' | 'left' | 'right' | 'top-right';
};

interface OSDManagerProps {
    events: OSDEvent[];
}

export const OSDManager: React.FC<OSDManagerProps> = ({ events }) => {
    // Show only the latest event per position to avoid clutter, or stack them.
    // For simplicity, let's just show them absolutely positioned.

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            <AnimatePresence>
                {events.map((ev) => (
                    <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, scale: 0.8, x: ev.position === 'left' ? -20 : ev.position === 'right' ? 20 : 0 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300, duration: 0.4 }}
                        className={`
                            absolute flex flex-col items-center justify-center gap-2
                            bg-dark-950/60 backdrop-blur-xl border border-white/10 
                            rounded-2xl shadow-2xl p-4 text-white/90 min-w-[80px]
                            ${ev.position === 'right' ? 'right-12 top-1/2 -translate-y-1/2' : ''}
                            ${ev.position === 'left' ? 'left-12 top-1/2 -translate-y-1/2' : ''}
                            ${ev.position === 'top-right' ? 'top-12 right-12' : ''}
                            ${(!ev.position || ev.position === 'center') ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
                        `}
                    >
                        <div className="flex items-center justify-center [&>svg]:w-8 [&>svg]:h-8">
                            {ev.icon}
                        </div>
                        {ev.text && (
                            <span className="text-sm font-semibold tracking-wide font-outfit">
                                {ev.text}
                            </span>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
