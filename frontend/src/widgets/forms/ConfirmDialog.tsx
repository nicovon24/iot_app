'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogBody } from '@/components';
import { ApiError } from '@/lib';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  isPending?: boolean;
  error?: unknown;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ isOpen, title, description, isPending, error, onConfirm, onClose }: ConfirmDialogProps) {
  const errorMessage = error instanceof ApiError ? error.message : error ? 'Unknown error' : null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} widthClassName="max-w-xs">
      <DialogBody className="flex flex-col gap-3 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-heading">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {errorMessage}
          </motion.div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </DialogBody>
    </Dialog>
  );
}
