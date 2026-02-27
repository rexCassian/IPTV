import { useEffect, useState, useCallback } from 'react';

interface WindowSize {
    width: number;
    height: number;
}

export function useWindowResize() {
    const [size, setSize] = useState<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const handleResize = useCallback(() => {
        requestAnimationFrame(() => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        });
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    const isCompact = size.width < 1100;
    const isMobile = size.width < 768;

    return { ...size, isCompact, isMobile };
}
