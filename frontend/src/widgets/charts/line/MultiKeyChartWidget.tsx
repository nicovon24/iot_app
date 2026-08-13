'use client';

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
import { seriesColor } from '@\/lib';
import type { AxisGroup } from '@\/lib';
import { TOOLTIP_STYLE, axisTick, formatTime, withUnit, mergeByTimestamp, type ChartSeries } from '../chart-shared';

export interface MultiKeyChartWidgetProps {
  /** One series per telemetry key (id = key name), for one entity. */
  series: ChartSeries[];
  /** Up to 2 axis groups, from groupKeysByUnit — a 3rd+ distinct unit's keys are reported via
   * omittedCount instead of a third axis. */
  axes: AxisGroup[];
  /** Keys left out because they belonged to a 3rd+ distinct unit group. */
  omittedKeys?: string[];
  isLoading?: boolean;
  title?: string;
}

/** Two or more telemetry keys plotted together for one entity — dual Y-axis when the keys
 * resolve to two different units, so "temperature vs pressure" reads on its own scale each. */
export function MultiKeyChartWidget({ series, axes, omittedKeys = [], isLoading, title }: MultiKeyChartWidgetProps) {
  const data = mergeByTimestamp(series);
  const axisIdForKey = new Map<string, 'left' | 'right'>();
  axes.forEach((axis, i) => {
    const axisId = i === 0 ? 'left' : 'right';
    for (const key of axis.keys) axisIdForKey.set(key, axisId);
  });

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
        <p className="text-sm text-muted">No historical data for these keys yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card flex h-full flex-col p-4">
      {title && <h3 className="shrink-0 truncate pb-1 text-sm font-semibold text-heading">{title}</h3>}
      {omittedKeys.length > 0 && (
        <p className="mb-1 shrink-0 text-xs text-faint">
          {omittedKeys.length} key{omittedKeys.length > 1 ? 's' : ''} not shown — too many distinct units
        </p>
      )}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="ts" tickFormatter={formatTime} stroke="var(--color-faint)" fontSize={12} />
            {axes[0] && (
              <YAxis
                yAxisId="left"
                stroke="var(--color-faint)"
                fontSize={12}
                tickFormatter={axisTick}
                label={
                  axes[0].unitSymbol
                    ? { value: axes[0].unitSymbol, angle: -90, position: 'insideLeft', fill: 'var(--color-muted)', fontSize: 11 }
                    : undefined
                }
              />
            )}
            {axes[1] && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--color-faint)"
                fontSize={12}
                tickFormatter={axisTick}
                label={
                  axes[1].unitSymbol
                    ? { value: axes[1].unitSymbol, angle: 90, position: 'insideRight', fill: 'var(--color-muted)', fontSize: 11 }
                    : undefined
                }
              />
            )}
            <RechartsTooltip
              labelFormatter={(label) => formatTime(Number(label))}
              formatter={(value, key) => {
                const axis = axes.find((a) => a.keys.includes(String(key)));
                return [withUnit(axis?.unitSymbol)(Number(value)), String(key)];
              }}
              contentStyle={TOOLTIP_STYLE}
            />
            {series.length > 1 && (
              <Legend
                formatter={(key) => <span className="text-xs text-muted">{String(key)}</span>}
                iconType="plainline"
                iconSize={14}
              />
            )}
            {series.map((s, i) => (
              <Line
                key={s.id}
                yAxisId={axisIdForKey.get(s.id) ?? 'left'}
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
