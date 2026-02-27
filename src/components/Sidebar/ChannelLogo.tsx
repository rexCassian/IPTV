import React, { memo, useState, useCallback } from 'react';
import { Tv2 } from 'lucide-react';

interface ChannelLogoProps {
    src: string;
    name: string;
    size?: number;
}

export const ChannelLogo = memo(function ChannelLogo({ src, name, size = 32 }: ChannelLogoProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const handleLoad = useCallback(() => setLoaded(true), []);
    const handleError = useCallback(() => setError(true), []);

    if (!src || error) {
        return (
            <div
                className="flex items-center justify-center rounded bg-dark-800 text-dark-500 shrink-0"
                style={{ width: size, height: size }}
            >
                <Tv2 size={size * 0.5} />
            </div>
        );
    }

    return (
        <div
            className="relative rounded overflow-hidden bg-dark-800 shrink-0"
            style={{ width: size, height: size }}
        >
            {/* Skeleton */}
            {!loaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 animate-shimmer bg-[length:200%_100%]" />
            )}
            <img
                src={src}
                alt={name}
                loading="lazy"
                onLoad={handleLoad}
                onError={handleError}
                className={`w-full h-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'
                    }`}
            />
        </div>
    );
});
