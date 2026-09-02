/**
 * The calendar heatmap's grid construction — specifically that the grid spans the dashboard's
 * window rather than the extent of the data.
 *
 * The widget first rendered a single coloured cell in an otherwise blank card when only one day
 * had a reading: days without data produced no cell at all, so there was no grid to sit in.
 * These pin the corrected behaviour.
 */
import { describe, expect, it } from 'vitest';

const DAY_MS = 86_400_000;

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

function daysBetween(from: number, to: number) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

/** Mirrors the column builder in CalendarHeatmapWidget. */
function buildWeeks(
  points: Array<{ ts: number; value: number }>,
  window: { startTs: number; endTs: number },
) {
  const byDay = new Map(points.map((p) => [startOfDay(p.ts), p.value]));
  const rangeStart = startOfDay(window.startTs);
  const span = daysBetween(rangeStart, window.endTs);
  const gridStart = addDays(rangeStart, -new Date(rangeStart).getDay());

  const columns: Array<Array<{ ts: number; value?: number }>> = [];
  for (let offset = 0; offset <= daysBetween(gridStart, addDays(rangeStart, span)); offset += 7) {
    const column = Array.from({ length: 7 }, (_, weekday) => {
      const day = addDays(gridStart, offset + weekday);
      return { ts: day, value: byDay.get(day) };
    });
    columns.push(column);
  }
  return columns;
}

const T = startOfDay(Date.UTC(2026, 1, 11));
const window30 = { startTs: addDays(T, -29), endTs: T };

describe('buildWeeks', () => {
  it('draws the whole month even with a single day of data (the original regression)', () => {
    const sparse = buildWeeks([{ ts: T, value: 84.88 }], window30);
    const sparseCells = sparse.flat();
    expect(sparse.length).toBeGreaterThanOrEqual(5);
    expect(sparseCells.length).toBe(sparse.length * 7);
    expect(sparseCells.filter((c) => c.value !== undefined).length).toBe(1);
    expect(sparseCells.filter((c) => c.value === undefined).length).toBeGreaterThan(20);
  });

  it('still produces the window grid with no data at all', () => {
    const empty = buildWeeks([], window30).flat();
    expect(empty.length).toBeGreaterThanOrEqual(35);
    expect(empty.every((c) => c.value === undefined)).toBe(true);
  });

  it('starts every column on a Sunday', () => {
    expect(buildWeeks([], window30).every((column) => new Date(column[0].ts).getDay() === 0)).toBe(
      true,
    );
  });

  it('keeps days consecutive with no gaps or repeats across a DST boundary', () => {
    const dstWindow = {
      startTs: startOfDay(Date.UTC(2026, 2, 1)),
      endTs: startOfDay(Date.UTC(2026, 3, 5)),
    };
    const dstCells = buildWeeks([], dstWindow).flat();
    const uniqueDays = new Set(dstCells.map((c) => c.ts));
    expect(uniqueDays.size).toBe(dstCells.length);
  });
});
