'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { seriesColor } from '@/lib/chart-palette';
import { TOOLTIP_STYLE, formatTime, formatValue, mergeByTimestamp, type ChartSeries } from './chart-shared';

export interface MultiSeriesBarChartWidgetProps {
  series: ChartSeries[];
  omittedCount?: number;
  isLoading?: boolean;
  title?: string;
}

/** Grouped bars, one group per timestamp bucket and one bar per entity — the fleet counterpart
 * of BarChartWidget, sharing the merge and formatting rules of the line charts. */
export function MultiSeriesBarChartWidget({
  series,
  omittedCount = 0,
  isLoading,
  title,
}: MultiSeriesBarChartWidgetProps) {
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
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="ts" tickFormatter={formatTime} stroke="var(--color-faint)" fontSize={12} />
            <YAxis stroke="var(--color-faint)" fontSize={12} tickFormatter={formatValue} />
            <RechartsTooltip
              labelFormatter={(label) => formatTime(Number(label))}
              formatter={(value, key) => [formatValue(Number(value)), nameById[String(key)] ?? String(key)]}
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'var(--color-surface)' }}
            />
            {/* Same rule as the line chart: past one series, identity never rests on hue alone. */}
            {series.length > 1 && (
              <Legend
                formatter={(key) => <span className="text-xs text-muted">{nameById[String(key)] ?? String(key)}</span>}
                iconType="square"
                iconSize={12}
              />
            )}
            {series.map((s, i) => (
              <Bar key={s.id} dataKey={s.id} name={s.name} fill={seriesColor(i)} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
