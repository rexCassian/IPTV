import React, { memo } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    delayDuration?: number;
}

export const Tooltip = memo(function Tooltip({
    content,
    children,
    side = 'top',
    delayDuration = 300,
}: TooltipProps) {
    return (
        <RadixTooltip.Provider delayDuration={delayDuration}>
            <RadixTooltip.Root>
                <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
                <RadixTooltip.Portal>
                    <RadixTooltip.Content
                        side={side}
                        sideOffset={5}
                        className="z-50 px-2.5 py-1.5 bg-dark-800 text-white text-xs rounded-md shadow-lg border border-dark-700/50
              animate-fade-in"
                    >
                        {content}
                        <RadixTooltip.Arrow className="fill-dark-800" />
                    </RadixTooltip.Content>
                </RadixTooltip.Portal>
            </RadixTooltip.Root>
        </RadixTooltip.Provider>
    );
});
