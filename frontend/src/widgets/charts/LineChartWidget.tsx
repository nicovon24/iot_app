'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TOOLTIP_STYLE, formatTime, formatValue } from './chart-shared';

export interface LineChartPoint {
  ts: number;
  value: number;
}

export interface LineChartWidgetProps {
  data: LineChartPoint[];
  dataKey: string;
  /** Optional header. Omitted on the entity-detail page, where the tab already names the chart. */
  title?: string;
  /** Tailwind height class. Defaults to the fixed height used on the entity-detail page;
   * dashboard cells pass `h-full` so the chart fills whatever the grid cell is sized to. */
  heightClassName?: string;
  /** 'step' holds each value until the next reading — the honest shape for discrete/state
   * series, where a smoothed curve would invent values that never occurred. */
  interpolation?: 'linear' | 'step';
}

export function LineChartWidget({
  data,
  dataKey,
  title,
  heightClassName = 'h-64',
  interpolation,
}: LineChartWidgetProps) {
  if (data.length === 0) {
    return (
      <div className={`glass-card flex ${heightClassName} items-center justify-center`}>
        <p className="text-sm text-muted">No historical data for this key yet</p>
      </div>
    );
  }

  return (
    <div className={`glass-card flex ${heightClassName} flex-col p-4`}>
      {title && <h3 className="shrink-0 truncate pb-2 text-sm font-semibold text-heading">{title}</h3>}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="ts"
            tickFormatter={formatTime}
            stroke="var(--color-faint)"
            fontSize={12}
          />
          <YAxis stroke="var(--color-faint)" fontSize={12} tickFormatter={formatValue} />
          <RechartsTooltip
            labelFormatter={(label) => formatTime(Number(label))}
            formatter={(value) => formatValue(Number(value))}
            contentStyle={TOOLTIP_STYLE}
          />
          <Line
            type={interpolation === 'step' ? 'stepAfter' : 'monotone'}
            dataKey="value"
            name={dataKey}
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
          />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
