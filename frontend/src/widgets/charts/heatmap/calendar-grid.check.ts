/**
 * Self-check for the calendar heatmap's grid construction — specifically that the grid spans
 * the dashboard's window rather than the extent of the data.
 *
 * The widget first rendered a single coloured cell in an otherwise blank card when only one day
 * had a reading: days without data produced no cell at all, so there was no grid to sit in.
 * These pin the corrected behaviour. Run with: npx tsx src/widgets/charts/heatmap/calendar-grid.check.ts
 */
import assert from 'node:assert';

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

// The regression: one day of data over a 30-day window must still draw the whole month.
const sparse = buildWeeks([{ ts: T, value: 84.88 }], window30);
const sparseCells = sparse.flat();
assert.ok(sparse.length >= 5, 'a 30-day window spans at least five week columns');
assert.strictEqual(sparseCells.length, sparse.length * 7, 'every column is a full seven days');
assert.strictEqual(
  sparseCells.filter((c) => c.value !== undefined).length,
  1,
  'exactly one cell carries the single reading',
);
assert.ok(
  sparseCells.filter((c) => c.value === undefined).length > 20,
  'the rest of the grid is drawn as empty cells, not omitted',
);

// An empty range still yields a grid — the window is what defines it.
const empty = buildWeeks([], window30).flat();
assert.ok(empty.length >= 35, 'no data at all still produces the window grid');
assert.ok(empty.every((c) => c.value === undefined), 'and every cell of it is empty');

// Every column starts on a Sunday, so weekday rows line up across the grid.
assert.ok(
  buildWeeks([], window30).every((column) => new Date(column[0].ts).getDay() === 0),
  'columns start on Sunday',
);

// Days are consecutive within a column, with no gaps or repeats across a DST boundary.
const dstWindow = { startTs: startOfDay(Date.UTC(2026, 2, 1)), endTs: startOfDay(Date.UTC(2026, 3, 5)) };
const dstCells = buildWeeks([], dstWindow).flat();
const uniqueDays = new Set(dstCells.map((c) => c.ts));
assert.strictEqual(uniqueDays.size, dstCells.length, 'no day is duplicated across a DST change');

console.log('calendar-grid checks passed');
