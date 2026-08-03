'use client';

import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { Play, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/Tooltip';
import type { EntityRef, PageData } from '@/types';

export interface EntityListWidgetProps {
  data?: PageData<EntityRef>;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  emptyLabel: string;
  onRowClick?: (entity: EntityRef) => void;
  onDelete?: (entity: EntityRef) => void;
  /** Optional card title rendered above the table, inside the same white card. */
  title?: string;
}

const TABLE_CLASSNAMES = {
  wrapper: 'h-full rounded-none border-0 bg-transparent p-0 shadow-none overflow-y-auto',
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
  title,
}: EntityListWidgetProps) {
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
                  {(onRowClick || onDelete) && (
                    <div className="flex justify-center gap-2">
                      {onRowClick && (
                        <Tooltip label="Details">
                          <button
                            type="button"
                            aria-label="Details"
                            onClick={() => onRowClick(entity)}
                            className="cursor-pointer flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 text-white shadow-sm transition-all duration-150 hover:scale-110 hover:shadow-md active:scale-95"
                          >
                            <Play size={10} fill="currentColor" strokeWidth={0} className="ml-px" />
                          </button>
                        </Tooltip>
                      )}
                      {onDelete && (
                        <Tooltip label="Delete">
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() => onDelete(entity)}
                            className="cursor-pointer flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition-all duration-150 hover:scale-110 hover:shadow-md active:scale-95"
                          >
                            <Trash2 size={10} />
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

  if (!title) {
    return <div className="h-full rounded-xl border border-border bg-surface-card p-0 shadow-sm">{content}</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-card shadow-sm">
      <h2 className="shrink-0 px-4 py-3 text-sm font-semibold text-heading">{title}</h2>
      <div className="min-h-0 flex-1">{content}</div>
    </div>
  );
}
