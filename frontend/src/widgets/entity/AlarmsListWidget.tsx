'use client';

import { RuledTable, type RuledColumn } from '@/components';
import { severityChipStyle } from '@/lib';
import type { Alarm, AlarmSeverity } from '@/types';

export interface AlarmsListWidgetProps {
  alarms?: Alarm[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  emptyLabel: string;
  /** Optional heading above the table, for the dashboard widget that embeds this list. */
  title?: string;
}

/**
 * Severity as a square chip.
 *
 * Square, not a pill: the system has no radii, and severity is the one place a colour has to
 * carry meaning on its own — the ink and its own 15% wash come from the same validated hex,
 * so the chip cannot drift from the donut slice describing the same alarm.
 */
function SeverityChip({ severity }: { severity: AlarmSeverity }) {
  return (
    <span
      className="inline-flex px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
      style={severityChipStyle(severity)}
    >
      {severity}
    </span>
  );
}

/** Board 3c: SEVERITY · STATUS · TYPE · ORIGINATOR · CREATED. */
const ALARM_COLUMNS: RuledColumn<Alarm>[] = [
  {
    key: 'severity',
    header: 'Severity',
    width: '130px',
    render: (alarm) => <SeverityChip severity={alarm.severity} />,
  },
  {
    key: 'status',
    header: 'Status',
    width: '1fr',
    render: (alarm) => <span className="t-meta truncate">{alarm.status}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    width: '1fr',
    render: (alarm) => (
      <span className="t-item truncate" title={alarm.type}>
        {alarm.type}
      </span>
    ),
  },
  {
    key: 'originator',
    header: 'Originator',
    width: '150px',
    render: (alarm) => (
      <span className="t-meta truncate">
        {alarm.originatorName ?? alarm.originatorLabel ?? alarm.originator.id}
      </span>
    ),
  },
  {
    key: 'created',
    header: 'Created',
    width: '150px',
    // Locale-formatted rather than raw: this is the one column a person reads as a time,
    // not as an identifier, so it keeps the reader's own conventions.
    render: (alarm) => (
      <span className="t-meta truncate">{new Date(alarm.startTs).toLocaleString()}</span>
    ),
  },
];

export function AlarmsListWidget({
  alarms,
  isLoading,
  isError,
  error,
  emptyLabel,
  title,
}: AlarmsListWidgetProps) {
  const table = (
    <RuledTable
      columns={ALARM_COLUMNS}
      rows={alarms ?? []}
      rowKey={(alarm) => `${alarm.id.id}-${alarm.startTs}`}
      isLoading={isLoading}
      isError={isError}
      error={error}
      emptyLabel={emptyLabel}
    />
  );

  if (!title) return table;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h2 className="t-heading shrink-0 pb-3">{title}</h2>
      <div className="min-h-0 flex-1">{table}</div>
    </div>
  );
}
