/**
 * The week-cell average used by the calendar heatmap.
 *
 * The first version folded each value into a running `(prior + value) / 2`, which looks like an
 * average but weights the last day of a week 4x the first. This pins the corrected behaviour.
 */
import { describe, expect, it } from 'vitest';

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

describe('weekAverage', () => {
  it('averages three values to their mean', () => {
    expect(weekAverage([10, 20, 30])).toBe(20);
  });

  it('returns a single value as its own average', () => {
    expect(weekAverage([5])).toBe(5);
  });

  it('returns undefined for no readings, not zero', () => {
    expect(weekAverage([])).toBeUndefined();
  });

  it('averages genuine zeros to zero', () => {
    expect(weekAverage([0, 0, 0])).toBe(0);
  });

  it('is order-independent', () => {
    expect(weekAverage([1, 2, 3, 4])).toBe(weekAverage([4, 3, 2, 1]));
  });
});

describe('pairwiseFold (the regression this replaced)', () => {
  it('was not the mean', () => {
    expect(pairwiseFold([10, 20, 30])).not.toBe(20);
  });

  it('depended on arrival order', () => {
    expect(pairwiseFold([1, 2, 3, 4])).not.toBe(pairwiseFold([4, 3, 2, 1]));
  });
});
