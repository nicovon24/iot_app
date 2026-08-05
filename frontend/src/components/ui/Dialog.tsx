'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Overrides the default max-width (e.g. "max-w-sm", "max-w-lg"). */
  widthClassName?: string;
}

/** Shared Radix Dialog + framer-motion shell for every popup in the app — replaces HeroUI's Modal. */
export function Dialog({ isOpen, onClose, children, widthClassName = 'max-w-sm' }: DialogProps) {
  return (
    <RadixDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild forceMount>
              <motion.div
                className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 ${widthClassName}`}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="glass-card relative max-h-[85vh] overflow-y-auto">
                  {children}
                </div>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <RadixDialog.Title className="text-lg font-semibold text-heading">{children}</RadixDialog.Title>;
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <RadixDialog.Description className="mt-1 text-sm text-muted">{children}</RadixDialog.Description>;
}

export function DialogBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function DialogFooter({ children, className = 'justify-end' }: { children: ReactNode; className?: string }) {
  return <div className={`flex gap-2 border-t border-border px-6 py-4 ${className}`}>{children}</div>;
}

export function DialogCloseButton() {
  return (
    <RadixDialog.Close asChild>
      <button
        type="button"
        aria-label="Close"
        className="rounded-full bg-surface p-1.5 text-body transition-colors hover:bg-border hover:text-heading"
      >
        <X size={16} />
      </button>
    </RadixDialog.Close>
  );
}
