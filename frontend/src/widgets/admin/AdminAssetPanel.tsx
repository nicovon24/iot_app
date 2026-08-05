'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { TableRowsSkeleton } from '@/components/feedback/Skeleton';
import { useCreateAsset, useDeleteAsset } from '@/hooks/useCreateAsset';
import { usePatchAsset } from '@/hooks/usePatchAsset';
import { useCustomerChildren, useAssetChildren, useInvalidateHierarchyChildren } from '@/hooks/useHierarchyChildren';
import { ConfirmDialog } from '@/widgets/forms/ConfirmDialog';
import { EditEntityDialog } from '@/widgets/forms/EditEntityDialog';
import { Dialog, DialogHeader, DialogTitle, DialogCloseButton, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Tooltip } from '@/components/ui/Tooltip';
import { toastError, toastSuccess } from '@/lib/toast';
import type { EntityRef } from '@/types';

const TABLE_CLASSNAMES = {
  base: 'h-full min-h-0',
  wrapper: 'h-full rounded-none border-0 bg-transparent p-0 shadow-none table-scroll overflow-auto',
  th: 'bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted first:rounded-none last:rounded-none border-b border-border py-3',
  td: 'text-left py-3 text-sm text-body group-data-[hover=true]:bg-surface',
  tr: 'border-b border-border last:border-b-0 transition-colors',
};

export interface AdminAssetPanelProps {
  /** Also doubles as the Asset's `type` on creation (e.g. "Site") — one level, one profile. */
  title: string;
  customerId?: string;
  /** Undefined until the previous hierarchy level has a selection — the column then stays empty. */
  parentId?: string;
  parentType: 'CUSTOMER' | 'ASSET';
  levelIndex: number;
  selectedAssetId?: string;
  onSelect: (asset: EntityRef) => void;
  readOnly?: boolean;
}

export function AdminAssetPanel({
  title,
  customerId,
  parentId,
  parentType,
  levelIndex,
  selectedAssetId,
  onSelect,
  readOnly = false,
}: AdminAssetPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingAsset, setEditingAsset] = useState<EntityRef | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EntityRef | null>(null);

  const customerChildren = useCustomerChildren(parentType === 'CUSTOMER' ? parentId : undefined);
  const assetChildren = useAssetChildren(parentType === 'ASSET' ? parentId : undefined);
  const { data, isLoading } = parentType === 'CUSTOMER' ? customerChildren : assetChildren;
  const assets = data?.assets ?? [];

  const createAsset = useCreateAsset();
  const patchAsset = usePatchAsset();
  const deleteAsset = useDeleteAsset();
  const invalidateChildren = useInvalidateHierarchyChildren();

  const closeAddDialog = () => {
    setIsAdding(false);
    setNewName('');
    setNewLabel('');
    createAsset.reset();
  };

  const submitCreate = () => {
    if (!customerId || !parentId || !newName.trim()) return;
    createAsset.mutate(
      { name: newName.trim(), type: title, label: newLabel.trim() || undefined, customerId, levelIndex, parentId },
      {
        onSuccess: () => {
          closeAddDialog();
          invalidateChildren({ id: parentId, type: parentType });
          toastSuccess(`${title} created`);
        },
        onError: (error) => toastError(`Couldn't create ${title}`, error),
      },
    );
  };

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    deleteAsset.reset();
  };

  return (
    <div className="glass-card flex h-96 shrink-0 flex-col gap-3 p-4 md:h-full md:min-h-0 md:w-full">
      <div className="flex items-center justify-between">
        <h2 className="truncate text-sm font-semibold text-heading" title={title}>
          {title}
        </h2>
        {!readOnly && (
          <button
            type="button"
            disabled={!parentId}
            onClick={() => setIsAdding((v) => !v)}
            title={parentId ? undefined : 'Select the previous level first'}
            className="flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
            style={{ color: 'var(--gradient-accent-from)' }}
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {parentId && isLoading && <TableRowsSkeleton rows={3} columns={2} />}

        {!isLoading && assets.length === 0 && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <p className="text-sm text-muted">
              {parentId ? `No ${title} here.` : 'Select the previous level first.'}
            </p>
          </div>
        )}

        {!isLoading && assets.length > 0 && (
          <Table aria-label={`${title} list`} classNames={TABLE_CLASSNAMES}>
            <TableHeader>
              <TableColumn>NAME</TableColumn>
              <TableColumn align="end">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody items={assets}>
              {(asset) => (
                <TableRow
                  key={asset.id}
                  className={`group cursor-pointer ${selectedAssetId === asset.id ? 'bg-surface' : ''}`}
                >
                  <TableCell className="font-medium text-heading" onClick={() => onSelect(asset)}>
                    {asset.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!readOnly && (
                      <Tooltip label="Edit">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAsset(asset);
                          }}
                          className="rounded p-1 text-body hover:bg-surface"
                          aria-label="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                      </Tooltip>
                      )}
                      {!readOnly && (
                      <Tooltip label="Delete">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete(asset);
                          }}
                          className="rounded p-1 text-red-600 hover:bg-surface"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? `this ${title}`}?`}
        description={`This permanently removes the ${title} from ThingsBoard. Blocked if it still has child Assets or linked Devices.`}
        isPending={deleteAsset.isPending}
        error={deleteAsset.error}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          if (!pendingDelete || !parentId) return;
          deleteAsset.mutate(pendingDelete.id, {
            onSuccess: () => {
              closeDeleteDialog();
              invalidateChildren({ id: parentId, type: parentType });
              toastSuccess(`${title} deleted`, pendingDelete.name);
            },
            onError: (error) => toastError(`Couldn't delete ${title}`, error),
          });
        }}
      />

      <Dialog isOpen={isAdding} onClose={closeAddDialog}>
        <DialogHeader>
          <DialogTitle>Add {title}</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-body" htmlFor="new-asset-name">
              Name
            </label>
            <input
              id="new-asset-name"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-heading outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-body" htmlFor="new-asset-label">
              Label (optional)
            </label>
            <input
              id="new-asset-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-heading outline-none focus:border-accent"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <button
            type="button"
            onClick={closeAddDialog}
            className="rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!newName.trim() || createAsset.isPending}
            onClick={submitCreate}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
          >
            {createAsset.isPending ? 'Creating…' : 'Create'}
          </button>
        </DialogFooter>
      </Dialog>

      <EditEntityDialog
        isOpen={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        title={`Edit ${title}`}
        entity={editingAsset}
        fields={['name', 'label']}
        isPending={patchAsset.isPending}
        error={patchAsset.error}
        onSubmit={(values) => {
          if (!editingAsset || !parentId || !values.name?.trim()) return;
          patchAsset.mutate(
            { id: editingAsset.id, dto: { name: values.name.trim(), label: values.label } },
            {
              onSuccess: () => invalidateChildren({ id: parentId, type: parentType }),
              onError: (error) => toastError("Couldn't rename", error),
            },
          );
          setEditingAsset(null);
        }}
      />
    </div>
  );
}
