import React, { memo } from 'react';

// EPGTimeline is currently a placeholder for the horizontal TV guide
// Full implementation would include horizontal scrolling time blocks
export const EPGTimeline = memo(function EPGTimeline() {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="flex items-center gap-0 overflow-x-auto bg-dark-900 border-b border-dark-800/50">
            {hours.map((hour) => (
                <div
                    key={hour}
                    className="flex items-center justify-center px-4 py-2 text-xs text-dark-400 border-r border-dark-800/30 shrink-0"
                    style={{ minWidth: 80 }}
                >
                    {String(hour).padStart(2, '0')}:00
                </div>
            ))}
        </div>
    );
});
