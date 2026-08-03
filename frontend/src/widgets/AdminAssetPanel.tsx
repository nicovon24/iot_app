'use client';

import { useState } from 'react';
import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { Plus, Pencil, Trash2, Check, X as XIcon } from 'lucide-react';
import { useCreateAsset, useDeleteAsset } from '@/hooks/useCreateAsset';
import { usePatchAsset } from '@/hooks/usePatchAsset';
import { useCustomerChildren, useAssetChildren, useInvalidateHierarchyChildren } from '@/hooks/useHierarchyChildren';
import { ConfirmDialog } from '@/widgets/ConfirmDialog';
import { ApiError } from '@/lib/api-client';
import type { EntityRef } from '@/types';

const TABLE_CLASSNAMES = {
  wrapper: 'h-full rounded-none border-0 bg-transparent p-0 shadow-none overflow-y-auto',
  th: 'bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted first:rounded-none last:rounded-none border-b border-border py-3',
  td: 'text-left py-3 text-sm text-body group-data-[hover=true]:bg-surface',
  tr: 'border-b border-border last:border-b-0 transition-colors',
};

export interface AdminAssetPanelProps {
  title: string;
  customerId: string;
  /** Undefined until the previous hierarchy level has a selection — the column then stays empty. */
  parentId?: string;
  parentType: 'CUSTOMER' | 'ASSET';
  levelIndex: number;
  selectedAssetId?: string;
  onSelect: (asset: EntityRef) => void;
}

export function AdminAssetPanel({
  title,
  customerId,
  parentId,
  parentType,
  levelIndex,
  selectedAssetId,
  onSelect,
}: AdminAssetPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<EntityRef | null>(null);

  const customerChildren = useCustomerChildren(parentType === 'CUSTOMER' ? parentId : undefined);
  const assetChildren = useAssetChildren(parentType === 'ASSET' ? parentId : undefined);
  const { data, isLoading } = parentType === 'CUSTOMER' ? customerChildren : assetChildren;
  const assets = data?.assets ?? [];

  const createAsset = useCreateAsset();
  const patchAsset = usePatchAsset();
  const deleteAsset = useDeleteAsset();
  const invalidateChildren = useInvalidateHierarchyChildren();

  const createErrorMessage =
    createAsset.error instanceof ApiError ? createAsset.error.message : createAsset.error ? 'Unknown error' : null;

  const submitCreate = () => {
    if (!parentId || !newName.trim() || !newType.trim()) return;
    createAsset.mutate(
      { name: newName.trim(), type: newType.trim(), customerId, levelIndex, parentId },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewName('');
          setNewType('');
          invalidateChildren({ id: parentId, type: parentType });
        },
      },
    );
  };

  const startEdit = (asset: EntityRef) => {
    setEditingId(asset.id);
    setEditName(asset.name);
  };

  const submitEdit = (id: string) => {
    if (!parentId || !editName.trim()) return;
    patchAsset.mutate(
      { id, dto: { name: editName.trim() } },
      {
        onSuccess: () => {
          setEditingId(null);
          invalidateChildren({ id: parentId, type: parentType });
        },
      },
    );
  };

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    deleteAsset.reset();
  };

  return (
    <div className="flex h-96 shrink-0 flex-col gap-3 rounded-xl border border-border bg-surface-card p-4 shadow-sm md:h-full md:min-h-0 md:w-full">
      <div className="flex items-center justify-between">
        <h2 className="truncate text-sm font-semibold text-heading" title={title}>
          {title}
        </h2>
        <button
          type="button"
          disabled={!parentId}
          onClick={() => setIsAdding((v) => !v)}
          title={parentId ? undefined : 'Select the previous level first'}
          className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-body hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={12} /> Add Asset
        </button>
      </div>

      {isAdding && parentId && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="rounded-md border border-border bg-surface-card px-2.5 py-1.5 text-sm text-heading outline-none focus:border-accent"
          />
          <input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="Type (e.g. warehouse)"
            className="rounded-md border border-border bg-surface-card px-2.5 py-1.5 text-sm text-heading outline-none focus:border-accent"
          />
          {createErrorMessage && <span className="text-xs text-red-700">{createErrorMessage}</span>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-md border border-border px-3 py-1 text-xs text-body hover:bg-surface-card"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={createAsset.isPending}
              onClick={submitCreate}
              className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:brightness-90 disabled:opacity-60"
            >
              {createAsset.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {parentId && isLoading && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <Spinner label="Loading…" color="primary" />
          </div>
        )}

        {!isLoading && assets.length === 0 && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <p className="text-sm text-muted">
              {parentId ? 'No Assets here.' : 'Select the previous level to see its Assets.'}
            </p>
          </div>
        )}

        {!isLoading && assets.length > 0 && (
          <Table aria-label={`${title} assets`} classNames={TABLE_CLASSNAMES}>
            <TableHeader>
              <TableColumn>NAME</TableColumn>
              <TableColumn>TYPE</TableColumn>
              <TableColumn align="end">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody items={assets}>
              {(asset) => (
                <TableRow
                  key={asset.id}
                  className={`group cursor-pointer ${selectedAssetId === asset.id ? 'bg-surface' : ''}`}
                >
                  <TableCell className="font-medium text-heading" onClick={() => editingId !== asset.id && onSelect(asset)}>
                    {editingId === asset.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-heading outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => submitEdit(asset.id)}
                          className="rounded p-1 text-accent hover:bg-surface"
                          aria-label="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-body hover:bg-surface"
                          aria-label="Cancel"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      asset.name
                    )}
                  </TableCell>
                  <TableCell onClick={() => editingId !== asset.id && onSelect(asset)}>{asset.type ?? '—'}</TableCell>
                  <TableCell>
                    {editingId !== asset.id && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(asset)}
                          className="rounded p-1 text-body hover:bg-surface"
                          aria-label="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(asset)}
                          className="rounded p-1 text-red-600 hover:bg-surface"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? 'this Asset'}?`}
        description="This permanently removes the Asset from ThingsBoard. Blocked if it still has child Assets or linked Devices."
        isPending={deleteAsset.isPending}
        error={deleteAsset.error}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          if (!pendingDelete || !parentId) return;
          deleteAsset.mutate(pendingDelete.id, {
            onSuccess: () => {
              closeDeleteDialog();
              invalidateChildren({ id: parentId, type: parentType });
            },
          });
        }}
      />
    </div>
  );
}
