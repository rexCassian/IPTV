import React, { memo, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    wide?: boolean;
}

export const Modal = memo(function Modal({ open, onClose, title, children, wide }: ModalProps) {
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose],
    );

    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <AnimatePresence>
                {open && (
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                            />
                        </Dialog.Overlay>
                        <Dialog.Content asChild onKeyDown={handleKeyDown}>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                  ${wide ? 'w-[700px]' : 'w-[500px]'} max-h-[85vh]
                  bg-dark-900 rounded-xl border border-dark-700/50 shadow-2xl flex flex-col overflow-hidden`}
                            >
                                <div className="flex items-center justify-between px-5 py-3 border-b border-dark-800/50">
                                    <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
                                    <Dialog.Close asChild>
                                        <button className="p-1.5 text-dark-400 hover:text-white transition-colors rounded-lg hover:bg-dark-800">
                                            <X size={18} />
                                        </button>
                                    </Dialog.Close>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5">{children}</div>
                            </motion.div>
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    );
});
