import React, { memo } from 'react';

export const MpvPlayer = memo(function MpvPlayer() {
    // mpv renders into its own window embedded via --wid flag
    // In this implementation, mpv runs as a separate process window
    // overlaid on the Electron window. The div below is a placeholder
    // that tells the user mpv is handling rendering.
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
            {/* mpv renders directly to this area via its own window/overlay */}
            <div id="mpv-container" className="w-full h-full" />
        </div>
    );
});
