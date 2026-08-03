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
import type { AttributesByScope, AttributeScope } from '@/types';

export interface AttributesTableWidgetProps {
  data?: AttributesByScope;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
}

const SCOPE_LABELS: Record<AttributeScope, string> = {
  CLIENT_SCOPE: 'Client attributes',
  SERVER_SCOPE: 'Server attributes',
  SHARED_SCOPE: 'Shared attributes',
};

const TABLE_CLASSNAMES = {
  wrapper: 'rounded-xl border border-border bg-surface-card p-0 shadow-sm',
  th: 'bg-surface text-center text-xs font-semibold uppercase tracking-wider text-muted border-b border-border py-3',
  td: 'text-center py-2.5 text-sm text-body',
  tr: 'border-b border-border last:border-b-0',
};

export function AttributesTableWidget({ data, isLoading, isError, error }: AttributesTableWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner label="Loading…" color="primary" />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-surface-card">
        <p className="text-sm text-danger">Failed to load attributes: {message}</p>
      </div>
    );
  }

  const scopes: AttributeScope[] = ['CLIENT_SCOPE', 'SERVER_SCOPE', 'SHARED_SCOPE'];

  return (
    <div className="flex flex-col gap-6">
      {scopes.map((scope) => {
        const attributes = data?.[scope] ?? [];
        return (
          <div key={scope} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-heading">{SCOPE_LABELS[scope]}</h3>
            {attributes.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-muted">
                No attributes in this scope
              </p>
            ) : (
              <Table aria-label={SCOPE_LABELS[scope]} classNames={TABLE_CLASSNAMES}>
                <TableHeader>
                  <TableColumn align="center">KEY</TableColumn>
                  <TableColumn align="center">VALUE</TableColumn>
                  <TableColumn align="center">LAST UPDATED</TableColumn>
                </TableHeader>
                <TableBody items={attributes}>
                  {(attribute) => (
                    <TableRow key={attribute.key}>
                      <TableCell className="font-medium text-heading">{attribute.key}</TableCell>
                      <TableCell>{String(attribute.value)}</TableCell>
                      <TableCell>{new Date(attribute.lastUpdateTs).toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
    </div>
  );
}
