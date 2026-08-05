'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogHeader, DialogTitle, DialogCloseButton, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { ApiError } from '@/lib/api-client';
import type { EntityRef } from '@/types';

export type EditableField = 'name' | 'label';

const FIELD_LABEL: Record<EditableField, string> = {
  name: 'Name',
  label: 'Label',
};

export interface EditEntityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entity: EntityRef | null;
  fields: EditableField[];
  isPending?: boolean;
  error?: unknown;
  onSubmit: (values: Partial<Record<EditableField, string>>) => void;
}

export function EditEntityDialog({
  isOpen,
  onClose,
  title,
  entity,
  fields,
  isPending,
  error,
  onSubmit,
}: EditEntityDialogProps) {
  const [values, setValues] = useState<Partial<Record<EditableField, string>>>({});

  useEffect(() => {
    if (!entity) return;
    const initial: Partial<Record<EditableField, string>> = {};
    for (const field of fields) {
      initial[field] = (entity[field] as string | undefined) ?? '';
    }
    setValues(initial);
    // Re-seed only when a different entity is opened, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity?.id]);

  const errorMessage = error instanceof ApiError ? error.message : error ? 'Unknown error' : null;
  const canSubmit = !fields.includes('name') || (values.name ?? '').trim().length > 0;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} widthClassName="max-w-sm">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogCloseButton />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-3">
        {fields.map((field) => (
          <div key={field} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-body" htmlFor={`edit-entity-${field}`}>
              {FIELD_LABEL[field]}
            </label>
            <input
              id={`edit-entity-${field}`}
              autoFocus={field === fields[0]}
              value={values[field] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-heading outline-none focus:border-accent"
            />
          </div>
        ))}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {errorMessage}
          </motion.div>
        )}
      </DialogBody>

      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending || !canSubmit}
          onClick={() => onSubmit(values)}
          style={{ background: 'var(--gradient-accent)' }}
          className="rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
