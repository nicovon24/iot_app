'use client';

import { formatTelemetryValue } from '@\/lib';
import type { TelemetryValue } from '@/types';

export interface TimeseriesTableWidgetProps {
  /** Configured key order — also the column order. */
  keys: string[];
  /** One history list per key, as returned by useMultiKeyHistoryForEntities. */
  byKey: Record<string, TelemetryValue[]>;
  isLoading?: boolean;
  title?: string;
  /** Per-key unit, shown once in the column header — not repeated per cell/row. */
  units?: Record<string, string>;
}

/**
 * History as a table: newest first, one row per timestamp, one column per configured key.
 *
 * Rows are keyed on the timestamp so several keys sampled in the same bucket share a row —
 * that alignment is the point, it's what lets you read "temperature and pressure at 14:05"
 * across. A key that reported nothing in a bucket leaves a blank cell rather than shifting
 * the other columns.
 */
function buildRows(keys: string[], byKey: Record<string, TelemetryValue[]>) {
  const rows = new Map<number, Record<string, string>>();
  for (const key of keys) {
    for (const point of byKey[key] ?? []) {
      const row = rows.get(point.ts) ?? {};
      row[key] = point.value;
      rows.set(point.ts, row);
    }
  }
  return Array.from(rows.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([ts, values]) => ({ ts, values }));
}

export function TimeseriesTableWidget({ keys, byKey, isLoading, title, units }: TimeseriesTableWidgetProps) {
  const rows = buildRows(keys, byKey);

  if (isLoading && rows.length === 0) return <Centered text="Loading…" />;
  if (keys.length === 0) return <Centered text="No telemetry keys selected for this table" />;
  if (rows.length === 0) return <Centered text="No historical data in this time window" />;

  return (
    <div className="glass-card flex h-full flex-col p-0">
      {title && (
        <h3 className="shrink-0 truncate border-b border-border px-4 py-3 text-sm font-semibold text-heading">
          {title}
        </h3>
      )}
      <div className="table-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th sticky>Timestamp</Th>
              {keys.map((key) => (
                <Th key={key}>{units?.[key] ? `${key} (${units[key]})` : key}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ts} className="border-b border-border last:border-b-0">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 font-medium text-heading">
                  {new Date(row.ts).toLocaleString()}
                </td>
                {keys.map((key) => {
                  const display = formatTelemetryValue(row.values[key]);
                  return (
                    <td key={key} className="px-3 py-2 text-body">
                      {display ?? <span className="text-faint">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <div className="glass-card flex h-full items-center justify-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function Th({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <th
      className={`sticky top-0 border-b border-border bg-surface px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted ${
        sticky ? 'left-0 z-20' : 'z-10'
      }`}
    >
      {children}
    </th>
  );
}
