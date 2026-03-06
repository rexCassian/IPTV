import React, { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface PlayPauseIndicatorProps {
    status: 'playing' | 'paused' | 'buffering' | 'idle' | 'loading' | 'error';
    onAction: () => void;
}

export const PlayPauseIndicator: React.FC<PlayPauseIndicatorProps> = ({ status, onAction }) => {
    const [show, setShow] = useState(false);
    const [icon, setIcon] = useState<'play' | 'pause'>('play');

    // We only want to trigger the animation when transitioning between play and pause
    useEffect(() => {
        if (status === 'playing') {
            setIcon('play');
            setShow(true);
            const timer = setTimeout(() => setShow(false), 500);
            return () => clearTimeout(timer);
        } else if (status === 'paused') {
            setIcon('pause');
            setShow(true);
            const timer = setTimeout(() => setShow(false), 500);
            return () => clearTimeout(timer);
        } else {
            setShow(false);
        }
    }, [status]);

    return (
        <div
            onClick={onAction}
            className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
        >
            <div
                className={`
                    w-24 h-24 rounded-full bg-dark-900/40 backdrop-blur-md 
                    flex items-center justify-center text-white/90
                    shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10
                    transition-all duration-500 pointer-events-none
                    ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}
                `}
            >
                {icon === 'play' ? (
                    <Play size={44} className="ml-2 fill-current" />
                ) : (
                    <Pause size={44} className="fill-current" />
                )}
            </div>
        </div>
    );
};
