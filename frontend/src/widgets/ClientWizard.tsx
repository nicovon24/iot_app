'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Check } from 'lucide-react';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { Dialog, DialogHeader, DialogCloseButton, DialogBody, DialogFooter } from '@/components/Dialog';
import { ApiError } from '@/lib/api-client';
import { toastSuccess } from '@/lib/toast';
import { DEFAULT_HIERARCHY_LEVEL_NAMES } from '@/lib/hierarchy-defaults';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  hierarchyLevels: z
    .array(z.object({ name: z.string().min(1, 'Level name is required') }))
    .min(1, 'At least one hierarchy level is required'),
});

type FormValues = z.infer<typeof schema>;

const STEPS = [
  { n: 1, label: 'Info' },
  { n: 2, label: 'Hierarchy' },
  { n: 3, label: 'Review' },
] as const;

type Step = 1 | 2 | 3;

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

export interface ClientWizardProps {
  isOpen: boolean;
  onClose: () => void;
  /** Creates the new Client as a sub-customer of this id instead of a top-level Client. */
  parentCustomerId?: string;
}

export function ClientWizard({ isOpen, onClose, parentCustomerId }: ClientWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const createCustomer = useCreateCustomer();

  const {
    register,
    control,
    handleSubmit,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      hierarchyLevels: DEFAULT_HIERARCHY_LEVEL_NAMES.map((name) => ({ name })),
    },
  });

  const { fields, append, remove, swap } = useFieldArray({ control, name: 'hierarchyLevels' });

  const close = () => {
    reset();
    setStep(1);
    createCustomer.reset();
    onClose();
  };

  const goNext = async () => {
    if (step === 1) {
      const valid = await trigger('name');
      if (valid) {
        setDirection(1);
        setStep(2);
      }
    } else if (step === 2) {
      const valid = await trigger('hierarchyLevels');
      if (valid) {
        setDirection(1);
        setStep(3);
      }
    }
  };

  const goBack = () => {
    setDirection(-1);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const onSubmit = handleSubmit((values) => {
    createCustomer.mutate(
      {
        name: values.name,
        parentCustomerId,
        hierarchyLevels: values.hierarchyLevels.map((l, i) => ({ levelIndex: i, name: l.name })),
      },
      {
        onSuccess: (customer) => {
          close();
          toastSuccess('Client created', customer.name);
        },
      },
    );
  });

  const errorMessage =
    createCustomer.error instanceof ApiError
      ? createCustomer.error.message
      : createCustomer.error
        ? 'Unknown error'
        : null;

  return (
    <Dialog isOpen={isOpen} onClose={close}>
      <DialogHeader>
        <div className="flex w-full flex-col gap-4 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-heading">Create Client</h2>
            <DialogCloseButton />
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <motion.div
                    animate={{
                      backgroundColor: step >= s.n ? 'var(--color-accent)' : 'var(--color-surface)',
                      borderColor: step >= s.n ? 'var(--color-accent)' : 'var(--color-border)',
                      color: step >= s.n ? '#fff' : 'var(--color-muted)',
                    }}
                    transition={{ duration: 0.25 }}
                    className="flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold"
                  >
                    {step > s.n ? <Check size={14} /> : s.n}
                  </motion.div>
                  <span
                    className={`text-[11px] font-medium uppercase tracking-wide ${step === s.n ? 'text-accent' : 'text-muted'}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="relative mb-4 h-px flex-1 bg-border">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-accent"
                      initial={false}
                      animate={{ width: step > s.n ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogHeader>

      <DialogBody>
        <div className="min-h-40 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              {step === 1 && (
                <motion.div
                  key="step-1"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2"
                >
                  <label className="text-sm font-medium text-body" htmlFor="client-name">
                    Client name
                  </label>
                  <input
                    id="client-name"
                    autoFocus
                    {...register('name')}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-accent"
                    placeholder="Test Comp"
                  />
                  <AnimatePresence>
                    {errors.name && (
                      <motion.span
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-600"
                      >
                        {errors.name.message}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-sm text-muted">Ordered hierarchy levels (e.g. Site → Area → Asset → Sensor).</p>

                  <div className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {fields.map((field, index) => (
                        <motion.div
                          layout
                          key={field.id}
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -20, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-2"
                        >
                          <GripVertical size={14} className="shrink-0 text-faint" />
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-accent">
                            {index + 1}
                          </div>
                          <input
                            {...register(`hierarchyLevels.${index}.name` as const)}
                            className="flex-1 rounded-md border-0 bg-transparent px-1 py-1 text-sm text-heading outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => index > 0 && swap(index, index - 1)}
                            disabled={index === 0}
                            className="rounded p-1.5 text-body transition hover:bg-surface-card disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => index < fields.length - 1 && swap(index, index + 1)}
                            disabled={index === fields.length - 1}
                            className="rounded p-1.5 text-body transition hover:bg-surface-card disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                            className="rounded p-1.5 text-red-600 transition hover:bg-surface-card disabled:opacity-30"
                            aria-label="Remove level"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {errors.hierarchyLevels && (
                    <span className="text-xs text-red-600">
                      {errors.hierarchyLevels.message ?? 'Check each level name'}
                    </span>
                  )}

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => append({ name: '' })}
                    className="flex w-fit items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-body hover:bg-surface"
                  >
                    <Plus size={14} /> Add level
                  </motion.button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  <div className="rounded-lg border border-border bg-surface p-4 text-sm">
                    <p className="font-semibold text-heading">{getValues('name')}</p>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {getValues('hierarchyLevels').map((l, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-2 text-body"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-accent">
                            {i + 1}
                          </span>
                          {l.name}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    The hierarchy cannot be changed after the Client is created. Review it carefully before
                    submitting.
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </DialogBody>

      <DialogFooter className="justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface"
            >
              Cancel
            </button>
          )}
          {step < 3 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={goNext}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
            >
              Next
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onSubmit}
              disabled={createCustomer.isPending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
            >
              {createCustomer.isPending ? 'Creating…' : 'Create Client'}
            </motion.button>
          )}
      </DialogFooter>
    </Dialog>
  );
}
