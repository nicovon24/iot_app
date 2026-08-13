'use client';

import { useMemo, useState } from 'react';
import { HEAT_COLORS, HEAT_EMPTY, heatColor } from '@/lib/chart-palette';
import { formatTelemetryValue } from '@/lib/format';

export interface CalendarHeatmapPoint {
  /** Start-of-day epoch ms. */
  ts: number;
  value: number;
}

export interface CalendarHeatmapWidgetProps {
  points: CalendarHeatmapPoint[];
  isLoading?: boolean;
  title?: string;
  unit?: string;
  /** The window the dashboard is showing. The grid always spans it in full — a day with no
   * reading is drawn as an empty cell, because a gap is a finding, not something to hide. */
  window?: { startTs: number; endTs: number };
}

/** Ten years of days. The grid is built per day, so an absurd range would otherwise iterate
 * for a visibly long time on every recompute. */
const MAX_DAYS = 3_653;

/** Below this many days the cells grow, so a short window doesn't render as a few specks in a
 * large empty card — the complaint that prompted this layout. */
const COMPACT_DAY_THRESHOLD = 120;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Cell {
  ts: number;
  value?: number;
}

/** Local midnight — the grid is in the viewer's days, so a reading at 23:00 lands on the day
 * they'd call it. */
function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(ts: number, days: number) {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Days between two local midnights. Stepped via the Date API rather than dividing the raw
 * millisecond gap, which drifts across a DST boundary (a day can be 23 or 25 hours). */
function daysBetween(from: number, to: number) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

/**
 * Daily values as a calendar grid: a column per week, a row per weekday, colour by magnitude.
 *
 * The grid always covers the dashboard's whole window, drawing days with no reading as empty
 * cells. That's the point of the shape — a fortnight of silence is a visible hole, which a
 * chart that only plots the points it has would quietly close up.
 *
 * Reading an exact value is explicitly not the goal; that's the timeseries table's job, and why
 * every cell carries a tooltip instead of a printed number.
 */
export function CalendarHeatmapWidget({ points, isLoading, title, unit, window }: CalendarHeatmapWidgetProps) {
  // Own tooltip rather than the `title` attribute: the native one waits about a second before
  // appearing, can't be styled to match the card, and drops the line break between date and
  // value. On a grid you sweep across, that delay makes the whole thing feel unresponsive.
  const [hovered, setHovered] = useState<{ cell: Cell; x: number; y: number } | null>(null);

  const { weeks, min, max, monthMarks, dayCount } = useMemo(() => {
    const sums = new Map<number, { sum: number; count: number }>();
    for (const p of points) {
      const day = startOfDay(p.ts);
      const prior = sums.get(day) ?? { sum: 0, count: 0 };
      // Sum and count rather than folding into a running average: averaging pairwise as values
      // arrive weights the last reading of a day far more than the first.
      sums.set(day, { sum: prior.sum + p.value, count: prior.count + 1 });
    }
    const byDay = new Map(Array.from(sums, ([day, { sum, count }]) => [day, sum / count]));

    const dataDays = Array.from(byDay.keys()).sort((a, b) => a - b);
    const rangeStart = window ? startOfDay(window.startTs) : dataDays[0];
    const rangeEnd = window ? startOfDay(window.endTs) : dataDays[dataDays.length - 1];

    if (rangeStart === undefined || rangeEnd === undefined) {
      return { weeks: [] as Cell[][], min: 0, max: 0, monthMarks: [], dayCount: 0 };
    }

    const span = Math.min(daysBetween(rangeStart, rangeEnd), MAX_DAYS);
    // Start on the Sunday on or before the range, so every column is a true week and weekdays
    // line up across the whole grid.
    const gridStart = addDays(rangeStart, -new Date(rangeStart).getDay());
    const columns: Cell[][] = [];
    const marks: Array<{ column: number; label: string }> = [];
    let lastMonth = -1;

    for (let offset = 0; offset <= daysBetween(gridStart, addDays(rangeStart, span)); offset += 7) {
      const column: Cell[] = [];
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const day = addDays(gridStart, offset + weekday);
        column.push({ ts: day, value: byDay.get(day) });
      }
      const month = new Date(column[0].ts).getMonth();
      if (month !== lastMonth) {
        marks.push({ column: columns.length, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
      columns.push(column);
    }

    const values = Array.from(byDay.values());
    return {
      weeks: columns,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      monthMarks: marks,
      dayCount: span,
    };
  }, [points, window]);

  if (isLoading && weeks.length === 0) return <Centered text="Loading…" />;
  if (weeks.length === 0) return <Centered text="No data in this time window" />;

  // A short window gets larger cells rather than leaving the card mostly empty.
  const size = dayCount <= COMPACT_DAY_THRESHOLD ? 20 : 13;
  const gap = dayCount <= COMPACT_DAY_THRESHOLD ? 4 : 3;
  const hasValues = max > min || min !== 0;

  return (
    <div className="glass-card relative flex h-full flex-col gap-2 p-4">
      {title && <h3 className="shrink-0 truncate text-sm font-semibold text-heading">{title}</h3>}

      {/* Scrolling moves the cells out from under a tooltip measured against the card, so it's
        * dismissed rather than left pointing at the wrong day. */}
      <div className="table-scroll min-h-0 flex-1 overflow-auto" onScroll={() => setHovered(null)}>
        <div className="flex" style={{ gap }}>
          <div className="flex shrink-0 flex-col" style={{ gap, paddingTop: 16 }}>
            {WEEKDAY_LABELS.map((label, i) => (
              <span
                key={label}
                className="text-[9px] text-faint"
                style={{ height: size, lineHeight: `${size}px` }}
              >
                {/* Every other row, so the labels don't crowd the grid. */}
                {i % 2 === 1 ? label : ''}
              </span>
            ))}
          </div>

          <div className="flex flex-col" style={{ gap }}>
            <div className="flex" style={{ gap }}>
              {weeks.map((_, i) => (
                <span
                  key={i}
                  className="text-[9px] leading-4 text-faint"
                  style={{ width: size }}
                >
                  {monthMarks.find((m) => m.column === i)?.label ?? ''}
                </span>
              ))}
            </div>

            <div className="flex" style={{ gap }}>
              {weeks.map((column, i) => (
                <div key={i} className="flex flex-col" style={{ gap }}>
                  {column.map((cell) => (
                    <div
                      key={cell.ts}
                      // Focusable so the reading is reachable by keyboard, not only by pointer —
                      // the value exists nowhere else in the widget.
                      tabIndex={0}
                      role="img"
                      aria-label={describeCell(cell, unit)}
                      className="cursor-default rounded-[2px] transition-transform hover:scale-125 hover:ring-1 hover:ring-accent focus:scale-125 focus:outline-none focus:ring-1 focus:ring-accent"
                      style={{
                        width: size,
                        height: size,
                        background: heatColor(cell.value, min, max),
                        // Empty days get a hairline so the grid reads as a grid even when most
                        // of it has no data — without it a sparse range looks like one stray dot.
                        boxShadow: cell.value === undefined ? 'inset 0 0 0 1px var(--color-border)' : undefined,
                      }}
                      onMouseEnter={(e) => setHovered(locate(e.currentTarget, cell))}
                      onFocus={(e) => setHovered(locate(e.currentTarget, cell))}
                      onMouseLeave={() => setHovered(null)}
                      onBlur={() => setHovered(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface-card px-2 py-1 shadow-lg"
          style={{ left: hovered.x, top: hovered.y - 6 }}
        >
          <p className="whitespace-nowrap text-[11px] font-medium text-heading">
            {formatCellDate(hovered.cell.ts)}
          </p>
          <p className="whitespace-nowrap text-[11px] text-muted">
            {hovered.cell.value === undefined
              ? 'No reading'
              : `${formatTelemetryValue(String(hovered.cell.value)) ?? hovered.cell.value}${unit ? ` ${unit}` : ''}`}
          </p>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-end gap-1.5 text-[10px] text-faint">
        <span className="mr-1 flex items-center gap-1">
          <span
            className="rounded-[2px]"
            style={{ width: 9, height: 9, background: HEAT_EMPTY, boxShadow: 'inset 0 0 0 1px var(--color-border)' }}
          />
          no data
        </span>
        {hasValues && <span>{formatTelemetryValue(String(min)) ?? min}</span>}
        {HEAT_COLORS.map((color) => (
          <span key={color} className="rounded-[2px]" style={{ width: 9, height: 9, background: color }} />
        ))}
        {hasValues && (
          <span>
            {formatTelemetryValue(String(max)) ?? max}
            {unit ? ` ${unit}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

/** A cell is a small square with no label of its own, so the tooltip spells the day out in
 * full — weekday included, since "was that a Sunday?" is exactly what the grid invites. */
function formatCellDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Half the tooltip's minimum width — how far from either card edge it must stay to render
 * whole rather than being clipped by the card's own bounds. */
const TOOLTIP_MARGIN = 70;

/**
 * Places the tooltip against the card, clamped inside it.
 *
 * Measured on each hover/focus rather than stored per cell: the grid scrolls horizontally, so a
 * position captured once goes stale the moment the user scrolls with the pointer held still.
 * Clamping matters most in the first and last columns, where a centred tooltip would otherwise
 * hang outside the card and be cut off.
 */
function locate(target: HTMLElement, cell: Cell) {
  const box = target.getBoundingClientRect();
  const card = target.closest('.glass-card')?.getBoundingClientRect();
  const cardWidth = card?.width ?? 0;
  const x = box.left - (card?.left ?? 0) + box.width / 2;
  return {
    cell,
    x: Math.min(Math.max(x, TOOLTIP_MARGIN), Math.max(cardWidth - TOOLTIP_MARGIN, TOOLTIP_MARGIN)),
    y: box.top - (card?.top ?? 0),
  };
}

/** Screen-reader text for one cell — the same two facts the tooltip shows. */
function describeCell(cell: Cell, unit?: string) {
  const date = formatCellDate(cell.ts);
  if (cell.value === undefined) return `${date}: no reading`;
  const value = formatTelemetryValue(String(cell.value)) ?? cell.value;
  return `${date}: ${value}${unit ? ` ${unit}` : ''}`;
}

function Centered({ text }: { text: string }) {
  return (
    <div className="glass-card flex h-full items-center justify-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
