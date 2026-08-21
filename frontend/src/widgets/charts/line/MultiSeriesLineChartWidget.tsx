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
import { seriesColor } from '@/lib';
import { TOOLTIP_STYLE, axisTick, formatTime, withUnit, mergeByTimestamp, type ChartSeries } from '../chart-shared';

export type { ChartSeries };

export interface MultiSeriesLineChartWidgetProps {
  series: ChartSeries[];
  /** Entities that exist but aren't plotted, so the chart can say so instead of pretending
   * it shows the whole fleet. */
  omittedCount?: number;
  isLoading?: boolean;
  title?: string;
  /** 'step' holds each value until the next reading — the honest shape for discrete/state
   * series, where a smoothed curve would invent values that never occurred. */
  interpolation?: 'linear' | 'step';
  unit?: string;
}

export function MultiSeriesLineChartWidget({
  series,
  omittedCount = 0,
  isLoading,
  title,
  interpolation,
  unit,
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
            <YAxis
              stroke="var(--color-faint)"
              fontSize={12}
              tickFormatter={axisTick}
              label={unit ? { value: unit, angle: -90, position: 'insideLeft', fill: 'var(--color-muted)', fontSize: 11 } : undefined}
            />
            <RechartsTooltip
              labelFormatter={(label) => formatTime(Number(label))}
              formatter={(value, key) => [withUnit(unit)(Number(value)), nameById[String(key)] ?? String(key)]}
              contentStyle={TOOLTIP_STYLE}
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
                type={interpolation === 'step' ? 'stepAfter' : 'monotone'}
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
