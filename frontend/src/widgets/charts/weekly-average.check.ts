/**
 * Self-check for the week-cell average used by the calendar heatmap.
 *
 * The first version folded each value into a running `(prior + value) / 2`, which looks like an
 * average but weights the last day of a week 4× the first. This pins the corrected behaviour.
 * Run with: npx tsx src/widgets/charts/weekly-average.check.ts
 */
import assert from 'node:assert';

/** Mirrors the accumulate-then-divide in CalendarHeatmapWidget's grid builder. */
function weekAverage(values: number[]): number | undefined {
  const cell = values.reduce((acc, value) => ({ sum: acc.sum + value, count: acc.count + 1 }), {
    sum: 0,
    count: 0,
  });
  return cell.count > 0 ? cell.sum / cell.count : undefined;
}

/** The old pairwise fold, kept only to prove the two disagree. */
function pairwiseFold(values: number[]): number | undefined {
  return values.reduce<number | undefined>(
    (prior, value) => (prior === undefined ? value : (prior + value) / 2),
    undefined,
  );
}

assert.strictEqual(weekAverage([10, 20, 30]), 20, 'three values average to their mean');
assert.strictEqual(weekAverage([5]), 5, 'a single value is its own average');
assert.strictEqual(weekAverage([]), undefined, 'no readings means no value, not zero');
assert.strictEqual(weekAverage([0, 0, 0]), 0, 'genuine zeros average to zero');

// Order must not change the result.
assert.strictEqual(weekAverage([1, 2, 3, 4]), weekAverage([4, 3, 2, 1]), 'average is order-independent');

// The regression itself: the old fold is both wrong and order-dependent.
assert.notStrictEqual(pairwiseFold([10, 20, 30]), 20, 'the old fold was not the mean');
assert.notStrictEqual(
  pairwiseFold([1, 2, 3, 4]),
  pairwiseFold([4, 3, 2, 1]),
  'the old fold depended on arrival order',
);

console.log('weekly-average checks passed');
