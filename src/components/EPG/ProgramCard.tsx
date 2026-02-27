import React, { memo } from 'react';
import type { Program } from '../../types/epg';
import { formatTime, formatDuration } from '../../utils/timeFormatter';

interface ProgramCardProps {
    program: Program;
    compact?: boolean;
}

export const ProgramCard = memo(function ProgramCard({ program, compact }: ProgramCardProps) {
    const duration = formatDuration(program.startTime, program.endTime);

    if (compact) {
        return (
            <div className="px-3 py-2 hover:bg-dark-800/30 transition-colors">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-white truncate flex-1">{program.title}</p>
                    <span className="text-[10px] text-dark-500 ml-2 shrink-0">
                        {formatTime(program.startTime)}
                    </span>
                </div>
                {program.category && (
                    <span className="text-[9px] text-dark-500 mt-0.5 inline-block">{program.category}</span>
                )}
            </div>
        );
    }

    return (
        <div className="p-3 bg-dark-800/30 rounded-lg hover:bg-dark-800/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{program.title}</p>
                    {program.description && (
                        <p className="text-xs text-dark-400 mt-1 line-clamp-2">{program.description}</p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs text-dark-400">
                        {formatTime(program.startTime)} — {formatTime(program.endTime)}
                    </p>
                    <p className="text-[10px] text-dark-500 mt-0.5">{duration}</p>
                </div>
            </div>
            {program.category && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-dark-700 rounded text-[10px] text-dark-300">
                    {program.category}
                </span>
            )}
        </div>
    );
});
