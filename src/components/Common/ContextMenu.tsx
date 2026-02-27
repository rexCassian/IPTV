import React, { memo } from 'react';
import * as RadixContextMenu from '@radix-ui/react-context-menu';

interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    shortcut?: string;
    danger?: boolean;
    separator?: boolean;
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    children: React.ReactNode;
}

export const ContextMenu = memo(function ContextMenu({ items, children }: ContextMenuProps) {
    return (
        <RadixContextMenu.Root>
            <RadixContextMenu.Trigger asChild>{children}</RadixContextMenu.Trigger>
            <RadixContextMenu.Portal>
                <RadixContextMenu.Content className="z-50 min-w-[180px] bg-dark-800 border border-dark-700/50 rounded-lg shadow-xl p-1 animate-fade-in">
                    {items.map((item, index) => {
                        if (item.separator) {
                            return (
                                <RadixContextMenu.Separator
                                    key={index}
                                    className="h-px bg-dark-700/50 my-1"
                                />
                            );
                        }

                        return (
                            <RadixContextMenu.Item
                                key={index}
                                onClick={item.onClick}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs cursor-pointer outline-none transition-colors
                  ${item.danger
                                        ? 'text-red-400 hover:bg-red-500/10 focus:bg-red-500/10'
                                        : 'text-dark-200 hover:bg-dark-700/50 focus:bg-dark-700/50'
                                    }`}
                            >
                                {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                                <span className="flex-1">{item.label}</span>
                                {item.shortcut && (
                                    <span className="text-[10px] text-dark-500 ml-4">{item.shortcut}</span>
                                )}
                            </RadixContextMenu.Item>
                        );
                    })}
                </RadixContextMenu.Content>
            </RadixContextMenu.Portal>
        </RadixContextMenu.Root>
    );
});
