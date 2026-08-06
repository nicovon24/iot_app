'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { seriesColor } from '@/lib/chart-palette';
import type { TelemetryValue } from '@/types';

export interface ChartSeries {
  /** Stable dataKey — the entity id, not its name, so a rename doesn't orphan the series. */
  id: string;
  name: string;
  points: TelemetryValue[];
}

export interface MultiSeriesLineChartWidgetProps {
  series: ChartSeries[];
  /** Entities that exist but aren't plotted, so the chart can say so instead of pretending
   * it shows the whole fleet. */
  omittedCount?: number;
  isLoading?: boolean;
  title?: string;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatValue(value: number) {
  return String(Number(value.toFixed(2)));
}

/**
 * Recharts needs one row array with a column per series, but each entity's history comes back
 * as its own list. Buckets line up across entities because every series is requested with the
 * same startTs/endTs/interval, so merging on the raw timestamp is safe — an entity that
 * reported nothing in a bucket simply has no key in that row, and Recharts gaps the line.
 */
function mergeByTimestamp(series: ChartSeries[]): Array<Record<string, number>> {
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

export function MultiSeriesLineChartWidget({
  series,
  omittedCount = 0,
  isLoading,
  title,
}: MultiSeriesLineChartWidgetProps) {
  const data = useMemo(() => mergeByTimestamp(series), [series]);
  const nameById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s.name])), [series]);

  if (isLoading) {
    return (
      <div className="glass-card flex h-full items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card flex h-full items-center justify-center">
        <p className="text-sm text-muted">No historical data for this key yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card flex h-full flex-col p-4">
      {title && <h3 className="shrink-0 truncate pb-1 text-sm font-semibold text-heading">{title}</h3>}
      {omittedCount > 0 && (
        <p className="mb-1 shrink-0 text-xs text-faint">
          Showing {series.length} of {series.length + omittedCount} entities
        </p>
      )}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="ts" tickFormatter={formatTime} stroke="var(--color-faint)" fontSize={12} />
            <YAxis stroke="var(--color-faint)" fontSize={12} tickFormatter={formatValue} />
            <RechartsTooltip
              labelFormatter={(label) => formatTime(Number(label))}
              formatter={(value, key) => [formatValue(Number(value)), nameById[String(key)] ?? String(key)]}
              contentStyle={{
                background: 'var(--color-surface-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            {/* A legend is mandatory past one series so identity never rests on hue alone.
             * Its text stays in the muted ink token rather than taking the series color. */}
            {series.length > 1 && (
              <Legend
                formatter={(key) => <span className="text-xs text-muted">{nameById[String(key)] ?? String(key)}</span>}
                iconType="plainline"
                iconSize={14}
              />
            )}
            {series.map((s, i) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.name}
                stroke={seriesColor(i)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
