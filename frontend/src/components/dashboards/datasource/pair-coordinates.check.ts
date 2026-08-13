/**
 * Self-check for coordinate pairing — the logic that silently emptied the movement heatmap when
 * it required exact timestamp equality. Run with: npx tsx src/dashboards/datasource/pair-coordinates.check.ts
 */
import assert from 'node:assert';
import { pairCoordinates, pairSeries } from './pair-coordinates';

const at = (ts: number, value: string) => ({ ts, value });
const T = 1_700_000_000_000;

// The original bug: same fix, timestamps a few ms apart. Must still pair.
assert.strictEqual(
  pairCoordinates([at(T, '10')], [at(T + 40, '20')]).length,
  1,
  'a few ms of skew must still pair',
);

// Exact equality still works.
assert.deepStrictEqual(pairCoordinates([at(T, '10')], [at(T, '20')]), [
  { lat: 10, lng: 20, intensity: 1 },
]);

// Beyond tolerance: two unrelated fixes must not be glued together.
assert.strictEqual(
  pairCoordinates([at(T, '10')], [at(T + 60_000, '20')]).length,
  0,
  'a minute apart is not one fix',
);

// Each latitude takes its nearest longitude, not the first available.
const paired = pairCoordinates(
  [at(T, '1'), at(T + 5_000, '2')],
  [at(T + 10, '10'), at(T + 5_010, '20')],
);
assert.deepStrictEqual(
  paired,
  [
    { lat: 1, lng: 10, intensity: 1 },
    { lat: 2, lng: 20, intensity: 1 },
  ],
  'each fix pairs with its own nearest sample',
);

// Newest-first input (how the API actually returns it) must still pair correctly.
assert.strictEqual(
  pairCoordinates([at(T + 5_000, '2'), at(T, '1')], [at(T + 5_000, '20'), at(T, '10')]).length,
  2,
  'descending input is sorted before walking',
);

// One-sided and junk data produce no points rather than NaN coordinates.
assert.strictEqual(pairCoordinates([at(T, '10')], []).length, 0, 'longitude missing entirely');
assert.strictEqual(pairCoordinates([], [at(T, '20')]).length, 0, 'latitude missing entirely');
assert.strictEqual(pairCoordinates([at(T, 'NORTH')], [at(T, '20')]).length, 0, 'non-numeric dropped');

// The same join backs the scatter chart's two-key mode, where the bug would show as an empty
// chart when comparing e.g. rssi against snr.
assert.deepStrictEqual(
  pairSeries([at(T, '-70')], [at(T + 35, '12')]),
  [{ ts: T, a: -70, b: 12 }],
  'skewed samples of two different keys still pair',
);
assert.strictEqual(
  pairSeries([at(T, '-70')], [at(T + 60_000, '12')]).length,
  0,
  'samples a minute apart are separate observations',
);
assert.deepStrictEqual(
  pairSeries(
    [at(T, '1'), at(T + 5_000, '2')],
    [at(T + 5_010, '20'), at(T + 10, '10')],
  ),
  [
    { ts: T, a: 1, b: 10 },
    { ts: T + 5_000, a: 2, b: 20 },
  ],
  'unsorted input pairs each sample with its nearest counterpart',
);
assert.strictEqual(pairSeries([at(T, 'ON')], [at(T, '5')]).length, 0, 'non-numeric dropped');

console.log('pair-coordinates checks passed');
