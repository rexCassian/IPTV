import React, { memo } from 'react';

interface EPGProgressBarProps {
    progress: number; // 0-1
    className?: string;
}

export const EPGProgressBar = memo(function EPGProgressBar({ progress, className = '' }: EPGProgressBarProps) {
    const percent = Math.max(0, Math.min(100, progress * 100));

    return (
        <div className={`h-1 bg-dark-700 rounded-full overflow-hidden ${className}`}>
            <div
                className="h-full bg-gradient-to-r from-accent-600 to-accent-400 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${percent}%` }}
            />
        </div>
    );
});
