import { useCallback, useEffect, useState } from 'react';
import type { Program } from '../types/epg';

export function useEPG(channelId: string | null) {
    const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch current program
    useEffect(() => {
        if (!channelId) {
            setCurrentProgram(null);
            return;
        }

        let cancelled = false;

        const fetchCurrent = async () => {
            try {
                const prog = await window.electronAPI.epg.getCurrentProgram(channelId);
                if (!cancelled) {
                    setCurrentProgram(prog as Program | null);
                }
            } catch {
                if (!cancelled) setCurrentProgram(null);
            }
        };

        fetchCurrent();

        // Refresh every 60 seconds
        const timer = setInterval(fetchCurrent, 60000);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [channelId]);

    // Fetch day's programs
    const fetchPrograms = useCallback(async (chId: string, date?: string) => {
        setLoading(true);
        try {
            const dateStr = date || new Date().toISOString().split('T')[0];
            const progs = await window.electronAPI.epg.getPrograms(chId, dateStr);
            setPrograms(progs as Program[]);
        } catch {
            setPrograms([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Listen for EPG updates
    useEffect(() => {
        const unsub = window.electronAPI.epg.onUpdated(() => {
            if (channelId) {
                window.electronAPI.epg.getCurrentProgram(channelId).then((prog) => {
                    setCurrentProgram(prog as Program | null);
                });
            }
        });
        return unsub;
    }, [channelId]);

    const refreshEpg = useCallback(async () => {
        await window.electronAPI.epg.forceRefresh();
    }, []);

    const getProgress = useCallback((program: Program | null): number => {
        if (!program) return 0;
        const now = Date.now() / 1000;
        const total = program.endTime - program.startTime;
        if (total <= 0) return 0;
        const elapsed = now - program.startTime;
        return Math.max(0, Math.min(1, elapsed / total));
    }, []);

    return {
        currentProgram,
        programs,
        loading,
        fetchPrograms,
        refreshEpg,
        getProgress,
    };
}
