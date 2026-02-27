import React, { memo, useEffect } from 'react';
import { useEPG } from '../../hooks/useEPG';
import { EPGProgressBar } from './EPGProgressBar';
import { ProgramCard } from './ProgramCard';
import { formatTime } from '../../utils/timeFormatter';
import { Clock, ChevronRight } from 'lucide-react';

interface EPGPanelProps {
    channelId: string;
}

export const EPGPanel = memo(function EPGPanel({ channelId }: EPGPanelProps) {
    const { currentProgram, programs, loading, fetchPrograms, getProgress } = useEPG(channelId);

    useEffect(() => {
        fetchPrograms(channelId);
    }, [channelId, fetchPrograms]);

    const progress = getProgress(currentProgram);

    return (
        <div className="bg-dark-900/50 rounded-lg border border-dark-800/50 overflow-hidden">
            {/* Current Program */}
            {currentProgram && (
                <div className="p-3 border-b border-dark-800/30">
                    <div className="flex items-center gap-1.5 text-[10px] text-accent-400 uppercase font-semibold mb-1.5">
                        <Clock size={10} />
                        Şu An
                    </div>
                    <p className="text-sm font-medium text-white truncate">{currentProgram.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-dark-400">
                            {formatTime(currentProgram.startTime)} — {formatTime(currentProgram.endTime)}
                        </span>
                    </div>
                    <EPGProgressBar progress={progress} className="mt-2" />
                </div>
            )}

            {/* Upcoming Programs */}
            <div className="max-h-48 overflow-y-auto">
                {!loading && programs.length > 0 && (
                    <div className="divide-y divide-dark-800/20">
                        {programs
                            .filter((p) => p.startTime > Date.now() / 1000)
                            .slice(0, 6)
                            .map((program) => (
                                <ProgramCard key={program.id} program={program} compact />
                            ))}
                    </div>
                )}

                {!loading && programs.length === 0 && !currentProgram && (
                    <div className="p-3 text-xs text-dark-500 text-center">
                        EPG verisi bulunamadı
                    </div>
                )}
            </div>
        </div>
    );
});
