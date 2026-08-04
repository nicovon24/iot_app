'use client';

import { Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import type { Alarm, AlarmSeverity } from '@/types';

export interface AlarmsListWidgetProps {
  alarms?: Alarm[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  emptyLabel: string;
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

const SEVERITY_CLASSNAMES: Record<AlarmSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  MAJOR: 'bg-red-100 text-red-700',
  WARNING: 'bg-amber-100 text-amber-700',
  MINOR: 'bg-amber-100 text-amber-700',
  INDETERMINATE: 'bg-gray-100 text-gray-700',
};

function SeverityChip({ severity }: { severity: AlarmSeverity }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_CLASSNAMES[severity]}`}
    >
      {severity}
    </span>
  );
}

export function AlarmsListWidget({ alarms, isLoading, isError, error, emptyLabel, title }: AlarmsListWidgetProps) {
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
    const rows = alarms ?? [];

    if (rows.length === 0) {
      content = (
        <div className="flex h-full min-h-40 items-center justify-center">
          <p className="text-sm text-muted">{emptyLabel}</p>
        </div>
      );
    } else {
      content = (
        <Table aria-label="Alarms list" classNames={TABLE_CLASSNAMES}>
          <TableHeader>
            <TableColumn align="center">SEVERITY</TableColumn>
            <TableColumn align="center">TYPE</TableColumn>
            <TableColumn align="center">STATUS</TableColumn>
            <TableColumn align="center">ORIGINATOR</TableColumn>
            <TableColumn align="center">START TIME</TableColumn>
          </TableHeader>
          <TableBody items={rows}>
            {(alarm) => (
              <TableRow key={`${alarm.id.id}-${alarm.startTs}`} className="group">
                <TableCell>
                  <SeverityChip severity={alarm.severity} />
                </TableCell>
                <TableCell className="font-medium text-heading">{alarm.type}</TableCell>
                <TableCell>{alarm.status}</TableCell>
                <TableCell>{alarm.originatorName ?? alarm.originatorLabel ?? alarm.originator.id}</TableCell>
                <TableCell>{new Date(alarm.startTs).toLocaleString()}</TableCell>
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
