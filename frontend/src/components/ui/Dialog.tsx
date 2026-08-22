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
                className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild forceMount>
              <motion.div
                className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 ${widthClassName}`}
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="surface-overlay relative max-h-[85vh] overflow-y-auto">
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
  return <RadixDialog.Title className="t-heading text-base">{children}</RadixDialog.Title>;
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <RadixDialog.Description className="mt-1 t-body text-muted">{children}</RadixDialog.Description>;
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
        className="rounded-full bg-tint p-1.5 text-muted transition-colors duration-fast ease-out hover:bg-tint-strong hover:text-heading"
      >
        <X size={16} />
      </button>
    </RadixDialog.Close>
  );
}
