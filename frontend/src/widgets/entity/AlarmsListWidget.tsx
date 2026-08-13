'use client';

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { BellOff } from 'lucide-react';
import { TableRowsSkeleton } from '@/components';
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
  CRITICAL: 'bg-red-500/15 text-red-400',
  MAJOR: 'bg-red-500/15 text-red-400',
  WARNING: 'bg-amber-500/15 text-amber-400',
  MINOR: 'bg-amber-500/15 text-amber-400',
  INDETERMINATE: 'bg-slate-500/15 text-slate-400',
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
    content = <TableRowsSkeleton rows={4} columns={5} />;
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
        <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-center">
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: 'linear-gradient(135deg, var(--gradient-info-from), var(--gradient-info-to))' }}
          >
            <BellOff size={20} className="text-white" strokeWidth={1.75} />
          </span>
          <p className="text-sm font-medium text-muted">{emptyLabel}</p>
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
    return <div className="glass-card h-full p-0">{content}</div>;
  }

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      <h2 className="shrink-0 px-4 py-3 text-sm font-semibold text-heading">{title}</h2>
      <div className="min-h-0 flex-1">{content}</div>
    </div>
  );
}
