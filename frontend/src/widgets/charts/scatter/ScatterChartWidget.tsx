'use client';

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { seriesColor } from '@/lib';
import { TOOLTIP_STYLE, axisTick, formatTime, withUnit } from '../chart-shared';

export interface ScatterPoint {
  x: number;
  y: number;
  /** Shown in the tooltip — the entity name in FLEET mode, the sample time in HISTORY mode. */
  label?: string;
}

export interface ScatterSeries {
  id: string;
  name: string;
  points: ScatterPoint[];
}

export interface ScatterChartWidgetProps {
  series: ScatterSeries[];
  xLabel: string;
  yLabel: string;
  /** True when the x axis carries timestamps, so ticks format as clock times. */
  xIsTime?: boolean;
  xUnit?: string;
  yUnit?: string;
  isLoading?: boolean;
  title?: string;
  omittedCount?: number;
}

/**
 * Two quantities plotted against each other, one dot per observation.
 *
 * This is the only chart here that answers "are these two related?" — a pair of line charts
 * shows both series but leaves the correlation for the viewer to infer by eye across two
 * panels. Signal quality (rssi against snr), efficiency (load against consumption) and drift
 * (temperature against error) are all this shape.
 *
 * Axes are labelled with their units because a scatter has no other cue for what's being
 * compared: unlike a time series, neither axis is self-evident.
 */
export function ScatterChartWidget({
  series,
  xLabel,
  yLabel,
  xIsTime,
  xUnit,
  yUnit,
  isLoading,
  title,
  omittedCount = 0,
}: ScatterChartWidgetProps) {
  const total = series.reduce((sum, s) => sum + s.points.length, 0);

  if (isLoading && total === 0) return <Centered text="Loading…" />;
  if (total === 0) return <Centered text="No paired readings for these two keys" />;

  const formatX = (value: number) => (xIsTime ? formatTime(value) : axisTick(value));

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
          <ScatterChart margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              tickFormatter={formatX}
              stroke="var(--color-faint)"
              fontSize={12}
              // A scatter's axes carry no implicit meaning, so both are named on the chart.
              label={{
                value: xUnit ? `${xLabel} (${xUnit})` : xLabel,
                position: 'insideBottom',
                offset: -10,
                fill: 'var(--color-muted)',
                fontSize: 11,
              }}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              tickFormatter={axisTick}
              stroke="var(--color-faint)"
              fontSize={12}
              label={{
                value: yUnit ? `${yLabel} (${yUnit})` : yLabel,
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--color-muted)',
                fontSize: 11,
                style: { textAnchor: 'middle' },
              }}
              domain={['dataMin', 'dataMax']}
            />
            {/* Fixed dot size: magnitude is already on both axes, and varying area would encode
              * a third variable that isn't there. */}
            <ZAxis range={[36, 36]} />
            <RechartsTooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border)' }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [
                withUnit(name === 'x' ? xUnit : name === 'y' ? yUnit : undefined)(Number(value)),
                name === 'x' ? xLabel : name === 'y' ? yLabel : String(name),
              ]}
              labelFormatter={() => ''}
            />
            {series.length > 1 && (
              <Legend
                formatter={(value) => <span className="text-xs text-muted">{value}</span>}
                iconType="circle"
                iconSize={10}
              />
            )}
            {series.map((s, i) => (
              <Scatter key={s.id} name={s.name} data={s.points} fill={seriesColor(i)} fillOpacity={0.75} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
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
