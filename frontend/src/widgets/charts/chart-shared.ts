import type { TelemetryValue } from '@/types';

export interface ChartSeries {
  /** Stable dataKey — the entity id, not its name, so a rename doesn't orphan the series. */
  id: string;
  name: string;
  points: TelemetryValue[];
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatValue(value: number) {
  return String(Number(value.toFixed(2)));
}

/** Tooltip chrome, identical across every chart so they read as one system. */
export const TOOLTIP_STYLE = {
  background: 'var(--color-surface-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
} as const;

/**
 * Recharts needs one row array with a column per series, but each entity's history comes back
 * as its own list. Buckets line up across entities because every series is requested with the
 * same startTs/endTs/interval, so merging on the raw timestamp is safe — an entity that
 * reported nothing in a bucket simply has no key in that row, and the chart gaps it.
 */
export function mergeByTimestamp(series: ChartSeries[]): Array<Record<string, number>> {
  const rows = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const point of s.points) {
      const row = rows.get(point.ts) ?? { ts: point.ts };
      row[s.id] = Number(point.value);
      rows.set(point.ts, row);
    }
  }
  return Array.from(rows.values()).sort((a, b) => a.ts - b.ts);
}
