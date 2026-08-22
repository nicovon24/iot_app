'use client';

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { BellOff } from 'lucide-react';
import { TableRowsSkeleton } from '@/components';
import { severityChipStyle, tableClassNames } from '@/lib';
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

const TABLE_CLASSNAMES = tableClassNames({});

function SeverityChip({ severity }: { severity: AlarmSeverity }) {
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={severityChipStyle(severity)}
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
            className="badge-quiet flex h-11 w-11 items-center justify-center rounded-full"
          >
            <BellOff size={20} strokeWidth={1.75} />
          </span>
          <p className="t-body text-muted">{emptyLabel}</p>
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
      <h2 className="shrink-0 px-4 py-3 t-heading">{title}</h2>
      <div className="min-h-0 flex-1">{content}</div>
    </div>
  );
}
