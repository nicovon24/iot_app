/**
 * Aggregation bucket sizing. The interval used to be pinned at five minutes regardless of range —
 * once 30/90-day presets existed, every history request asked ThingsBoard for tens of thousands
 * of buckets and came back 400 Bad Request, blanking every chart on the dashboard at once.
 */
import { describe, expect, it } from 'vitest';
import { intervalForWindow } from './history';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ThingsBoard rejects requests well before this, but any range producing more buckets than a
 * chart has pixels is already wasteful. */
const MAX_SAFE_BUCKETS = 2_000;

function buckets(spanMs: number) {
  const endTs = Date.now();
  return spanMs / intervalForWindow({ startTs: endTs - spanMs, endTs });
}

const PRESET_SPANS: Array<[string, number]> = [
  ['15 minutes', 15 * MINUTE],
  ['1 hour', HOUR],
  ['6 hours', 6 * HOUR],
  ['24 hours', DAY],
  ['7 days', 7 * DAY],
  ['30 days', 30 * DAY],
  ['90 days', 90 * DAY],
];

describe('intervalForWindow', () => {
  it.each(PRESET_SPANS)('keeps %s within a safe and useful bucket count', (_label, span) => {
    const count = buckets(span);
    expect(count).toBeLessThanOrEqual(MAX_SAFE_BUCKETS);
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it('the old fixed 5-minute interval really was out of range for 90 days', () => {
    expect((90 * DAY) / (5 * MINUTE)).toBeGreaterThan(MAX_SAFE_BUCKETS);
  });

  it('now uses a coarser bucket than five minutes for a 90-day window', () => {
    expect(intervalForWindow({ startTs: 0, endTs: 90 * DAY })).toBeGreaterThan(5 * MINUTE);
  });

  it('keeps fine-grained buckets for a short window', () => {
    expect(intervalForWindow({ startTs: 0, endTs: HOUR })).toBeLessThanOrEqual(5 * MINUTE);
  });

  it('grows the bucket size monotonically with the window', () => {
    const spans = PRESET_SPANS.map(([, span]) => span);
    const intervals = spans.map((span) => intervalForWindow({ startTs: 0, endTs: span }));
    expect(intervals).toEqual([...intervals].sort((a, b) => a - b));
  });

  it('never produces a zero or negative bucket for a degenerate window', () => {
    expect(intervalForWindow({ startTs: 0, endTs: 0 })).toBeGreaterThan(0);
    expect(intervalForWindow({ startTs: 100, endTs: 0 })).toBeGreaterThan(0);
  });
});
