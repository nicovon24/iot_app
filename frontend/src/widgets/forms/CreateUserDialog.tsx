'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useCreateUser } from '@/hooks/useUsers';
import { Dialog, DialogHeader, DialogTitle, DialogCloseButton, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { ApiError } from '@/lib/api-client';
import { toastSuccess } from '@/lib/toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
  role: z.enum(['ADMIN', 'READER']),
});

type FormValues = z.infer<typeof schema>;

export interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
}

export function CreateUserDialog({ isOpen, onClose, customerId }: CreateUserDialogProps) {
  const createUser = useCreateUser();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', role: 'READER' },
  });

  const close = () => {
    reset();
    createUser.reset();
    onClose();
  };

  const onSubmit = handleSubmit((values) => {
    createUser.mutate(
      { ...values, customerId },
      {
        onSuccess: (user) => {
          close();
          toastSuccess('User created', user.name);
        },
      },
    );
  });

  const errorMessage =
    createUser.error instanceof ApiError ? createUser.error.message : createUser.error ? 'Unknown error' : null;

  return (
    <Dialog isOpen={isOpen} onClose={close}>
      <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>Add User</DialogTitle>
        <DialogCloseButton />
      </DialogHeader>

      <DialogBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-body" htmlFor="user-email">
              Email
            </label>
            <input
              id="user-email"
              autoFocus
              type="email"
              {...register('email')}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-accent"
              placeholder="operator@customer-a.com"
            />
            {errors.email && <span className="text-xs text-red-400">{errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-body" htmlFor="user-password">
              Password
            </label>
            <input
              id="user-password"
              type="password"
              {...register('password')}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-accent"
              placeholder="changeme123"
            />
            {errors.password && <span className="text-xs text-red-400">{errors.password.message}</span>}
          </div>

          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select
                label="Role"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'READER', label: 'Reader' },
                ]}
              />
            )}
          />

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {errorMessage}
            </motion.div>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <button
          type="button"
          onClick={close}
          className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface"
        >
          Cancel
        </button>
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          disabled={createUser.isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
        >
          {createUser.isPending ? 'Creating…' : 'Create User'}
        </motion.button>
      </DialogFooter>
      </form>
    </Dialog>
  );
}
