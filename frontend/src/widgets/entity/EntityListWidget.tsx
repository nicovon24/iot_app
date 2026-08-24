'use client';

import { useState } from 'react';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tooltip } from '@/components';
import { RuledEmpty, RuledName, RuledTable, type RuledColumn } from '@/components';
import { EditEntityDialog, type EditableField } from '../forms/EditEntityDialog';
import type { EntityRef, PageData } from '@/types';

export type { EditableField };
export type EntityColumn = RuledColumn<EntityRef>;

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
  /** READER accounts: Edit/Delete are hidden entirely, not just disabled. */
  readOnly?: boolean;
  /**
   * The middle columns, between the always-present name and the trailing actions. Each board
   * specifies its own — Devices reads TYPE/LABEL/CLIENT, Clients reads PARENT/ASSETS/DEVICES,
   * Users reads USER/ROLE — so the track list is the caller's decision rather than a lowest
   * common denominator that fits none of them.
   */
  columns?: EntityColumn[];
  /** Extra action buttons rendered before Edit/Delete — e.g. Users' "Login as". Hidden with
   * the rest of the actions when readOnly. */
  extraActions?: (entity: EntityRef) => ReactNode;
}

/** A mono cell — the boards set every machine-read value in the monospace face. */
export function metaCell(value: string | undefined) {
  return value ? <span className="t-meta truncate">{value}</span> : <RuledEmpty />;
}

/** The default middle columns: the Devices board's TYPE / LABEL / CLIENT. */
export const DEFAULT_ENTITY_COLUMNS: EntityColumn[] = [
  { key: 'type', header: 'Type', width: '108px', render: (e) => metaCell(e.type) },
  {
    key: 'label',
    header: 'Label',
    width: '1fr',
    render: (e) => (e.label ? <span className="truncate text-[12px] text-body">{e.label}</span> : <RuledEmpty />),
  },
  { key: 'client', header: 'Client', width: '120px', render: (e) => metaCell(e.customerId?.name) },
];

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
  readOnly,
  columns = DEFAULT_ENTITY_COLUMNS,
  extraActions,
}: EntityListWidgetProps) {
  const [editingEntity, setEditingEntity] = useState<EntityRef | null>(null);
  const rows = data?.data ?? [];

  const canEdit = !readOnly && !!editableFields && editableFields.length > 0;
  const hasActions = Boolean(onRowClick || extraActions || canEdit || (!readOnly && onDelete));

  const allColumns: EntityColumn[] = [
    { key: 'name', header: 'Name', width: '1fr', render: (e) => <RuledName name={e.name} /> },
    ...columns,
    ...(hasActions
      ? [
          {
            key: 'actions',
            width: '84px',
            align: 'right' as const,
            render: (entity: EntityRef) => (
              // stopPropagation on the wrapper, not on each button: the row itself is
              // clickable, and every control in here means something other than "open".
              <span className="flex items-center gap-3.5" onClick={(e) => e.stopPropagation()}>
                {!readOnly && extraActions?.(entity)}
                {canEdit && (
                  <Tooltip label="Edit">
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => setEditingEntity(entity)}
                      className="text-faint transition-colors duration-fast ease-out hover:text-accent"
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                  </Tooltip>
                )}
                {!readOnly && onDelete && (
                  <Tooltip label="Delete">
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => onDelete(entity)}
                      className="text-faint transition-colors duration-fast ease-out hover:text-danger"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </Tooltip>
                )}
                {onRowClick && (
                  <ChevronRight
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden
                    className="text-faint transition-colors duration-fast ease-out group-hover:text-accent"
                  />
                )}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <RuledTable
        columns={allColumns}
        rows={rows}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        isError={isError}
        error={error}
        emptyLabel={emptyLabel}
        onRowClick={onRowClick}
        total={data?.totalElements}
      />

      {editableFields && editableFields.length > 0 && (
        <EditEntityDialog
          isOpen={!!editingEntity}
          entity={editingEntity}
          fields={editableFields}
          title={editTitle ?? 'Edit'}
          isPending={isEditPending}
          error={editError}
          onClose={() => setEditingEntity(null)}
          onSubmit={(values) => {
            if (!editingEntity) return;
            onEditSave?.(editingEntity, values);
            setEditingEntity(null);
          }}
        />
      )}
    </>
  );
}
