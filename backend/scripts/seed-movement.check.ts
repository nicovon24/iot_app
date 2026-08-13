/**
 * Offline check for the trail generator in seed-movement.ts — verifies the shape of the walk
 * without contacting ThingsBoard, so the seed can be trusted before it writes to a real tenant.
 *
 * Run from backend/: npx tsx scripts/seed-movement.check.ts
 */
import assert from 'node:assert';
import { buildTrail, STOPS } from './seed-movement';

const METRES_PER_DEG_LAT = 111_320;

/** Rough metres between two nearby coordinates — good enough to test clustering. */
function metresApart(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const dLat = (a.latitude - b.latitude) * METRES_PER_DEG_LAT;
  const dLng =
    (a.longitude - b.longitude) * METRES_PER_DEG_LAT * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

const endTs = Date.now();
const startTs = endTs - 7 * 86_400_000;
const trail = buildTrail(startTs, endTs, 300_000);

assert.ok(trail.length > 2000, `a week at 5-minute samples is ~2016 points, got ${trail.length}`);

// Coordinates must be real numbers in Berlin's neighbourhood — a NaN here would silently
// produce an empty heatmap rather than an error.
assert.ok(
  trail.every((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)),
  'every coordinate is finite',
);
assert.ok(
  trail.every((p) => p.latitude > 52.4 && p.latitude < 52.6 && p.longitude > 13.2 && p.longitude < 13.5),
  'every point sits within greater Berlin',
);

// Timestamps must ascend and stay inside the requested window.
assert.ok(
  trail.every((p, i) => i === 0 || p.ts > trail[i - 1].ts),
  'timestamps ascend',
);
assert.ok(trail[0].ts >= startTs && trail[trail.length - 1].ts <= endTs, 'points stay in the window');

// The point of the shape: most samples cluster at stops, which is what builds heat. An even
// spread would render as a uniform smear and defeat the widget.
const nearAStop = trail.filter((p) => STOPS.some((s) => metresApart(p, s) < 300)).length;
const clustered = nearAStop / trail.length;
assert.ok(clustered > 0.6, `expected most points parked at stops, got ${Math.round(clustered * 100)}%`);

// Every stop must actually be visited, or the trail is a subset of the route it claims.
for (const stop of STOPS) {
  assert.ok(
    trail.some((p) => metresApart(p, stop) < 150),
    `stop "${stop.label}" is visited`,
  );
}

// Dwell jitter must produce genuinely distinct positions — identical points would stack into a
// single pixel instead of a blob.
const atMitte = trail.filter((p) => metresApart(p, STOPS[0]) < 150);
const distinct = new Set(atMitte.map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`));
assert.ok(distinct.size > atMitte.length * 0.9, 'parked samples scatter rather than repeat');

console.log(`seed-movement checks passed (${trail.length} points, ${Math.round(clustered * 100)}% at stops)`);
