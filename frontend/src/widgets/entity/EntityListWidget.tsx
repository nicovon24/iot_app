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
import { Building2, Cpu, Box, Pencil, Play, Trash2, UserCog } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tooltip } from '@/components';
import { EntityRowsSkeleton, TableRowsSkeleton } from '@/components';
import { EditEntityDialog, type EditableField } from '../forms/EditEntityDialog';
import type { EntityRef, EntityType, PageData } from '@/types';
import { tableClassNames } from '@/lib';

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
  /** Optional card title rendered above the list, inside the same white card. */
  title?: string;
  /** READER accounts: Edit/Delete are hidden entirely, not just disabled. */
  readOnly?: boolean;
  /** 'cards' (default) — the avatar/badge row layout. 'table' — the classic
   * NAME/TYPE/CUSTOMER/ACTIONS table, kept for the dashboard's compact widgets. */
  variant?: 'cards' | 'table';
  /** Overrides the small caption under the name. Defaults to `entity.type` — Users pass the
   * app role instead, since every user row would otherwise read the same literal "USER". */
  subtitleOf?: (entity: EntityRef) => string;
  /** Overrides the right-hand secondary text. Defaults to the entity's customer name. */
  metaOf?: (entity: EntityRef) => string | undefined;
  /** Extra action buttons rendered before Edit/Delete — e.g. Users' "Login as". Hidden with
   * the rest of the actions when readOnly. */
  extraActions?: (entity: EntityRef) => ReactNode;
}

const TYPE_ICONS: Record<EntityType, typeof Cpu> = {
  DEVICE: Cpu,
  ASSET: Box,
  CUSTOMER: Building2,
};

function EntityAvatar({ type }: { type: EntityType }) {
  // Fallback rather than an index crash: Users are EntityRefs whose `type` isn't one of the
  // three entity kinds this map was built for.
  const Icon = TYPE_ICONS[type] ?? UserCog;
  return (
    <span
      aria-hidden
      className="badge-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
    >
      <Icon size={20} strokeWidth={1.75} />
    </span>
  );
}

const TABLE_CLASSNAMES = tableClassNames({});

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
  readOnly = false,
  subtitleOf,
  metaOf,
  extraActions,
  variant = 'cards',
}: EntityListWidgetProps) {
  const [editingEntity, setEditingEntity] = useState<EntityRef | null>(null);

  let content: React.ReactNode;

  if (isLoading) {
    content = variant === 'table' ? <TableRowsSkeleton rows={4} columns={4} /> : <EntityRowsSkeleton rows={4} />;
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
    } else if (variant === 'table') {
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
                <TableCell>{subtitleOf ? subtitleOf(entity) : entity.type}</TableCell>
                <TableCell>{(metaOf ? metaOf(entity) : entity.customerId?.name) ?? ''}</TableCell>
                <TableCell>
                  {(onRowClick || (!readOnly && (onDelete || editableFields || extraActions))) && (
                    <div className="flex justify-center gap-3">
                      {!readOnly && extraActions?.(entity)}
                      {onRowClick && (
                        <Tooltip label="Details">
                          <button
                            type="button"
                            aria-label="Details"
                            onClick={() => onRowClick(entity)}
                            className="flex items-center justify-center rounded p-1 text-heading transition-colors hover:bg-tint"
                          >
                            <Play size={15} fill="currentColor" strokeWidth={0} />
                          </button>
                        </Tooltip>
                      )}
                      {!readOnly && editableFields && editableFields.length > 0 && (
                        <Tooltip label="Edit">
                          <button
                            type="button"
                            aria-label="Edit"
                            onClick={() => setEditingEntity(entity)}
                            className="flex items-center justify-center rounded p-1 text-muted transition-colors hover:bg-tint hover:text-heading"
                          >
                            <Pencil size={15} />
                          </button>
                        </Tooltip>
                      )}
                      {!readOnly && onDelete && (
                        <Tooltip label="Delete">
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() => onDelete(entity)}
                            className="flex items-center justify-center rounded p-1 text-danger transition-colors hover:bg-tint"
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
    } else {
      content = (
        <div className="table-scroll flex h-full flex-col gap-3 overflow-y-auto p-4">
          {rows.map((entity) => (
            <div
              key={entity.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-card px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <EntityAvatar type={entity.type} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate t-heading">{entity.name}</span>
                  <span className="t-label">{subtitleOf ? subtitleOf(entity) : entity.type}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                {(metaOf ? metaOf(entity) : entity.customerId?.name) && (
                  <span className="hidden text-xs text-muted sm:inline">
                    {metaOf ? metaOf(entity) : entity.customerId?.name}
                  </span>
                )}

                {(onRowClick || (!readOnly && (editableFields || onDelete || extraActions))) && (
                  <div className="flex items-center gap-2">
                    {!readOnly && extraActions?.(entity)}
                    {onRowClick && (
                      <Tooltip label="Details">
                        <button
                          type="button"
                          aria-label="Details"
                          onClick={() => onRowClick(entity)}
                          className="btn-accent flex h-9 w-9 items-center justify-center rounded-full"
                        >
                          <Play size={14} fill="currentColor" strokeWidth={0} />
                        </button>
                      </Tooltip>
                    )}
                    {!readOnly && editableFields && editableFields.length > 0 && (
                      <Tooltip label="Edit">
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={() => setEditingEntity(entity)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-muted transition-colors hover:text-heading"
                        >
                          <Pencil size={14} />
                        </button>
                      </Tooltip>
                    )}
                    {!readOnly && onDelete && (
                      <Tooltip label="Delete">
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={() => onDelete(entity)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-danger/15 text-danger transition-colors hover:bg-danger/25"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  const widget = !title ? (
    <div className="glass-card h-full p-0">{content}</div>
  ) : (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      <h2 className="shrink-0 px-4 py-3 t-heading">{title}</h2>
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
