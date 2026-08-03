'use client';

import { Modal, ModalContent, ModalBody } from '@heroui/react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ApiError } from '@/lib/api-client';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xs"
      placement="center"
      classNames={{
        base: 'my-auto rounded-2xl bg-surface-card border border-border',
        backdrop: 'bg-black/50 backdrop-blur-sm',
      }}
    >
      <ModalContent>
        <ModalBody className="flex flex-col gap-3 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
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
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
