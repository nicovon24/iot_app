/**
 * Self-check for aggregation bucket sizing.
 *
 * The interval used to be pinned at five minutes regardless of range. The moment 30- and 90-day
 * presets existed, every history request asked ThingsBoard for tens of thousands of buckets and
 * came back 400 Bad Request — charts across the whole dashboard went blank at once.
 *
 * Run with: npx tsx src/dashboards/datasource/interval-for-window.check.ts
 */
import assert from 'node:assert';
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

// Every preset offered in the picker must produce a request ThingsBoard will accept.
const PRESET_SPANS: Array<[string, number]> = [
  ['15 minutes', 15 * MINUTE],
  ['1 hour', HOUR],
  ['6 hours', 6 * HOUR],
  ['24 hours', DAY],
  ['7 days', 7 * DAY],
  ['30 days', 30 * DAY],
  ['90 days', 90 * DAY],
];

for (const [label, span] of PRESET_SPANS) {
  const count = buckets(span);
  assert.ok(count <= MAX_SAFE_BUCKETS, `${label} asks for ${Math.round(count)} buckets, too many`);
  assert.ok(count >= 10, `${label} asks for only ${Math.round(count)} buckets, too coarse to plot`);
}

// The regression itself: 90 days at the old fixed 5-minute bucket.
assert.ok(
  (90 * DAY) / (5 * MINUTE) > MAX_SAFE_BUCKETS,
  'the old fixed interval really was out of range for 90 days',
);
assert.ok(
  intervalForWindow({ startTs: 0, endTs: 90 * DAY }) > 5 * MINUTE,
  '90 days now uses a coarser bucket than five minutes',
);

// Short windows must keep fine resolution rather than being over-corrected.
assert.ok(
  intervalForWindow({ startTs: 0, endTs: HOUR }) <= 5 * MINUTE,
  'an hour still gets fine-grained buckets',
);

// Monotonic: a longer window never asks for a smaller bucket.
const spans = PRESET_SPANS.map(([, span]) => span);
const intervals = spans.map((span) => intervalForWindow({ startTs: 0, endTs: span }));
assert.deepStrictEqual(
  intervals,
  [...intervals].sort((a, b) => a - b),
  'bucket size grows with the window',
);

// Degenerate input must not produce a zero or negative bucket, which would be an invalid request.
assert.ok(intervalForWindow({ startTs: 0, endTs: 0 }) > 0, 'an empty window still yields a valid bucket');
assert.ok(intervalForWindow({ startTs: 100, endTs: 0 }) > 0, 'an inverted window still yields a valid bucket');

console.log('interval-for-window checks passed');
