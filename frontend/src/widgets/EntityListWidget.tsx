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
import { Pencil, Play, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';
import { EditEntityDialog, type EditableField } from '@/widgets/EditEntityDialog';
import type { EntityRef, PageData } from '@/types';

export type { EditableField };

export interface EntityListWidgetProps {
  data?: PageData<EntityRef>;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  emptyLabel: string;
  onRowClick?: (entity: EntityRef) => void;
  onDelete?: (entity: EntityRef) => void;
  /** Which fields the Edit action can change — omit to hide the Edit action entirely. */
  editableFields?: EditableField[];
  editTitle?: string;
  onEditSave?: (entity: EntityRef, values: Partial<Record<EditableField, string>>) => void;
  isEditPending?: boolean;
  editError?: unknown;
  /** Optional card title rendered above the table, inside the same white card. */
  title?: string;
}

const TABLE_CLASSNAMES = {
  base: 'h-full min-h-0',
  wrapper: 'h-full rounded-none border-0 bg-transparent p-0 shadow-none table-scroll overflow-auto',
  th: 'bg-surface text-center text-xs font-semibold uppercase tracking-wider text-muted first:rounded-none last:rounded-none border-b border-border py-3',
  td: 'text-center py-3 text-sm text-body group-data-[hover=true]:bg-surface',
  tr: 'border-b border-border last:border-b-0 transition-colors',
};

export function EntityListWidget({
  data,
  isLoading,
  isError,
  error,
  emptyLabel,
  onRowClick,
  onDelete,
  editableFields,
  editTitle,
  onEditSave,
  isEditPending,
  editError,
  title,
}: EntityListWidgetProps) {
  const [editingEntity, setEditingEntity] = useState<EntityRef | null>(null);

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <div className="flex h-full min-h-40 items-center justify-center">
        <Spinner label="Loading…" color="primary" />
      </div>
    );
  } else if (isError) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    content = (
      <div className="flex h-full min-h-40 items-center justify-center">
        <p className="text-sm text-danger">Failed to load: {message}</p>
      </div>
    );
  } else {
    const rows = data?.data ?? [];

    if (rows.length === 0) {
      content = (
        <div className="flex h-full min-h-40 items-center justify-center">
          <p className="text-sm text-muted">{emptyLabel}</p>
        </div>
      );
    } else {
      content = (
        <Table aria-label="Entity list" classNames={TABLE_CLASSNAMES}>
          <TableHeader>
            <TableColumn align="center">NAME</TableColumn>
            <TableColumn align="center">TYPE</TableColumn>
            <TableColumn align="center">CUSTOMER</TableColumn>
            <TableColumn align="center">ACTIONS</TableColumn>
          </TableHeader>
          <TableBody items={rows}>
            {(entity) => (
              <TableRow key={entity.id} className="group">
                <TableCell className="font-medium text-heading">{entity.name}</TableCell>
                <TableCell>{entity.type}</TableCell>
                <TableCell>{entity.customerId?.name ?? '—'}</TableCell>
                <TableCell>
                  {(onRowClick || onDelete || editableFields) && (
                    <div className="flex justify-center gap-3">
                      {onRowClick && (
                        <Tooltip label="Details">
                          <button
                            type="button"
                            aria-label="Details"
                            onClick={() => onRowClick(entity)}
                            className="flex items-center justify-center rounded p-1 text-heading transition-colors hover:bg-surface"
                          >
                            <Play size={15} fill="currentColor" strokeWidth={0} />
                          </button>
                        </Tooltip>
                      )}
                      {editableFields && editableFields.length > 0 && (
                        <Tooltip label="Edit">
                          <button
                            type="button"
                            aria-label="Edit"
                            onClick={() => setEditingEntity(entity)}
                            className="flex items-center justify-center rounded p-1 text-muted transition-colors hover:bg-surface hover:text-heading"
                          >
                            <Pencil size={15} />
                          </button>
                        </Tooltip>
                      )}
                      {onDelete && (
                        <Tooltip label="Delete">
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() => onDelete(entity)}
                            className="flex items-center justify-center rounded p-1 text-red-600 transition-colors hover:bg-surface"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }
  }

  const widget = !title ? (
    <div className="h-full rounded-xl border border-border bg-surface-card p-0 shadow-sm">{content}</div>
  ) : (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-card shadow-sm">
      <h2 className="shrink-0 px-4 py-3 text-sm font-semibold text-heading">{title}</h2>
      <div className="min-h-0 flex-1">{content}</div>
    </div>
  );

  return (
    <>
      {widget}
      {editableFields && (
        <EditEntityDialog
          isOpen={!!editingEntity}
          onClose={() => setEditingEntity(null)}
          title={editTitle ?? 'Edit'}
          entity={editingEntity}
          fields={editableFields}
          isPending={isEditPending}
          error={editError}
          onSubmit={(values) => {
            if (editingEntity) onEditSave?.(editingEntity, values);
            setEditingEntity(null);
          }}
        />
      )}
    </>
  );
}
