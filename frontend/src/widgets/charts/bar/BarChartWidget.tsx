'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TOOLTIP_STYLE, axisTick, formatTime, withUnit } from '../chart-shared';
import type { LineChartPoint } from '../line/LineChartWidget';

export interface BarChartWidgetProps {
  data: LineChartPoint[];
  dataKey: string;
  title?: string;
  heightClassName?: string;
  unit?: string;
}

/**
 * The same series a line chart would draw, as bars. Bars read better for bucketed aggregates
 * (hourly totals, counts per interval) where each value covers a span rather than marking an
 * instant — a line implies a continuous reading between points that a SUM per bucket isn't.
 */
export function BarChartWidget({ data, dataKey, title, heightClassName = 'h-64', unit }: BarChartWidgetProps) {
  if (data.length === 0) {
    return (
      <div className={`glass-card flex ${heightClassName} items-center justify-center`}>
        <p className="text-sm text-muted">No historical data for this key yet</p>
      </div>
    );
  }

  return (
    <div className={`glass-card flex ${heightClassName} flex-col p-4`}>
      {title && <h3 className="shrink-0 truncate pb-2 t-heading">{title}</h3>}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
              formatter={(value) => withUnit(unit)(Number(value))}
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'var(--color-surface)' }}
            />
            <Bar dataKey="value" name={dataKey} fill="var(--color-accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
