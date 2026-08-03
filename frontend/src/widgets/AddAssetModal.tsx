'use client';

import { useMemo, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem } from '@heroui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { useCustomers } from '@/hooks/useCustomers';
import { useCustomerHierarchy } from '@/hooks/useCustomerHierarchy';
import { useEntities } from '@/hooks/useEntities';
import { useCreateAsset } from '@/hooks/useCreateAsset';
import { ApiError } from '@/lib/api-client';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  label: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const SELECT_CLASSNAMES = {
  label: 'text-sm font-medium text-body',
  trigger:
    'rounded-md border border-border bg-surface data-[hover=true]:bg-surface-card data-[open=true]:border-accent shadow-none',
  value: 'text-sm text-heading',
  popoverContent: 'rounded-md border border-border bg-surface-card shadow-lg',
};

export interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAssetModal({ isOpen, onClose }: AddAssetModalProps) {
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [levelIndex, setLevelIndex] = useState<number | undefined>(undefined);
  const [parentId, setParentId] = useState<string | undefined>(undefined);

  const customersQuery = useCustomers();
  const hierarchyQuery = useCustomerHierarchy(customerId);
  const assetsQuery = useEntities('ASSET');
  const createAsset = useCreateAsset();

  const existingAssetsUnderCustomer = useMemo(
    () => (assetsQuery.data?.data ?? []).filter((a) => a.customerId?.id === customerId),
    [assetsQuery.data, customerId],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const close = () => {
    reset();
    setCustomerId(undefined);
    setLevelIndex(undefined);
    setParentId(undefined);
    createAsset.reset();
    onClose();
  };

  const onSubmit = handleSubmit((values) => {
    if (!customerId || levelIndex === undefined || !parentId) return;
    createAsset.mutate(
      { name: values.name, type: values.type, label: values.label, customerId, levelIndex, parentId },
      { onSuccess: close },
    );
  });

  const errorMessage =
    createAsset.error instanceof ApiError ? createAsset.error.message : createAsset.error ? 'Unknown error' : null;

  const needsParentButNoneAvailable = levelIndex !== undefined && levelIndex > 0 && existingAssetsUnderCustomer.length === 0;

  const canSubmit = !!customerId && levelIndex !== undefined && !!parentId && !needsParentButNoneAvailable;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      size="sm"
      placement="center"
      scrollBehavior="inside"
      classNames={{
        base: 'w-full max-w-md max-h-[85vh] my-auto rounded-2xl bg-surface-card border border-border',
        backdrop: 'bg-black/50 backdrop-blur-sm',
        closeButton:
          'top-4 end-4 rounded-full bg-surface text-body hover:bg-border hover:text-heading transition-colors',
      }}
    >
      <ModalContent>
        <ModalHeader className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-heading">Add Asset</h2>
        </ModalHeader>

        <ModalBody className="flex flex-col gap-3 px-6 py-4">
          <Select
            label="Client"
            placeholder="Select a Client"
            labelPlacement="outside"
            variant="bordered"
            size="sm"
            classNames={SELECT_CLASSNAMES}
            selectedKeys={customerId ? [customerId] : []}
            onSelectionChange={(keys) => {
              const [key] = Array.from(keys) as string[];
              setCustomerId(key);
              setLevelIndex(undefined);
              setParentId(undefined);
            }}
          >
            {(customersQuery.data?.data ?? []).map((c) => (
              <SelectItem key={c.id}>{c.name}</SelectItem>
            ))}
          </Select>

          <Select
            label="Hierarchy level"
            placeholder={customerId ? 'Select a level' : 'Pick a Client first'}
            labelPlacement="outside"
            variant="bordered"
            size="sm"
            isDisabled={!customerId}
            classNames={SELECT_CLASSNAMES}
            selectedKeys={levelIndex !== undefined ? [String(levelIndex)] : []}
            onSelectionChange={(keys) => {
              const [key] = Array.from(keys) as string[];
              const idx = key !== undefined ? Number(key) : undefined;
              setLevelIndex(idx);
              setParentId(idx === 0 ? customerId : undefined);
            }}
          >
            {(hierarchyQuery.data ?? []).map((l) => (
              <SelectItem key={String(l.levelIndex)}>{l.name}</SelectItem>
            ))}
          </Select>

          <AnimatePresence initial={false}>
            {levelIndex !== undefined && levelIndex > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-1.5 overflow-hidden"
              >
                <Select
                  label="Parent Asset"
                  placeholder={
                    needsParentButNoneAvailable ? 'No Assets available under this Client yet' : 'Select a parent Asset'
                  }
                  labelPlacement="outside"
                  variant="bordered"
                  size="sm"
                  isDisabled={needsParentButNoneAvailable}
                  classNames={SELECT_CLASSNAMES}
                  selectedKeys={parentId ? [parentId] : []}
                  onSelectionChange={(keys) => {
                    const [key] = Array.from(keys) as string[];
                    setParentId(key);
                  }}
                >
                  {existingAssetsUnderCustomer.map((a) => (
                    <SelectItem key={a.id}>{a.name}</SelectItem>
                  ))}
                </Select>
                {needsParentButNoneAvailable && (
                  <span className="text-xs text-red-700">Create a level-0 Asset for this Client first.</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-body" htmlFor="asset-name">
                Name
              </label>
              <input
                id="asset-name"
                {...register('name')}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-heading outline-none focus:border-accent"
              />
              {errors.name && <span className="text-xs text-red-700">{errors.name.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-body" htmlFor="asset-type">
                Type
              </label>
              <input
                id="asset-type"
                {...register('type')}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-heading outline-none focus:border-accent"
                placeholder="warehouse"
              />
              {errors.type && <span className="text-xs text-red-700">{errors.type.message}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-body" htmlFor="asset-label">
              Label (optional)
            </label>
            <input
              id="asset-label"
              {...register('label')}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-heading outline-none focus:border-accent"
            />
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
        </ModalBody>

        <ModalFooter className="border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface"
          >
            Cancel
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onSubmit}
            disabled={!canSubmit || createAsset.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
          >
            {createAsset.isPending ? 'Creating…' : 'Create Asset'}
          </motion.button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
