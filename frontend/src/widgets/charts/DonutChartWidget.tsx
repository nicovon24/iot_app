'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { seriesColor } from '@/lib/chart-palette';
import { TOOLTIP_STYLE } from './chart-shared';

export interface DonutSlice {
  name: string;
  value: number;
  /** Overrides the categorical palette — used where a category already has a meaning-carrying
   * colour, like alarm severity. */
  color?: string;
}

export interface DonutChartWidgetProps {
  slices: DonutSlice[];
  isLoading?: boolean;
  title?: string;
  /** Word for what's being counted, shown under the total: "alarms", "devices". */
  unitNoun?: string;
}

/**
 * Composition of a countable set — how a whole splits into categories.
 *
 * A donut rather than a pie because the hole is useful: the total goes in it, which is the
 * number people actually read first ("47 alarms, mostly minor"). Slice angles answer the
 * follow-up.
 *
 * Only meaningful for things that genuinely sum to a whole — alarms by severity, devices by
 * type. Telemetry is not offered as a source anywhere upstream for that reason: a pie of
 * temperatures implies the readings add up to something, and they don't.
 */
export function DonutChartWidget({ slices, isLoading, title, unitNoun }: DonutChartWidgetProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (isLoading && total === 0) return <Centered text="Loading…" />;
  if (slices.length === 0 || total === 0) return <Centered text="Nothing to count" />;

  return (
    <div className="glass-card flex h-full flex-col p-4">
      {title && <h3 className="shrink-0 truncate pb-1 text-sm font-semibold text-heading">{title}</h3>}

      <div className="flex min-h-0 flex-1 items-center gap-3">
        <div className="relative h-full min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((slice, i) => (
                  <Cell key={slice.name} fill={slice.color ?? seriesColor(i)} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => [
                  `${value} (${Math.round((Number(value) / total) * 100)}%)`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* The total sits in the hole — the headline number, with the breakdown around it. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-heading">{total}</span>
            {unitNoun && <span className="text-[10px] uppercase tracking-wider text-muted">{unitNoun}</span>}
          </div>
        </div>

        {/* A legend, not slice labels: labels on a donut collide as soon as two slices are thin. */}
        <div className="table-scroll flex max-h-full shrink-0 flex-col gap-1 overflow-y-auto pr-1">
          {slices.map((slice, i) => (
            <div key={slice.name} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ background: slice.color ?? seriesColor(i) }}
              />
              <span className="truncate text-muted" title={slice.name}>
                {slice.name}
              </span>
              <span className="ml-auto shrink-0 font-medium tabular-nums text-heading">{slice.value}</span>
            </div>
          ))}
        </div>
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
