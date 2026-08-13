import type { TelemetryValue } from '@/types';

/**
 * How far apart two samples of different keys can be and still count as one observation.
 *
 * Exact timestamp equality doesn't work: ThingsBoard timestamps each key as it's written, so a
 * device sending several in one payload still commonly lands them a few milliseconds apart, and
 * matching on equality drops every point — which is exactly how the movement heatmap first
 * shipped, and why it rendered empty against real data. Ten seconds survives that skew while
 * staying far below any realistic reporting interval, so it can't pair two genuinely different
 * observations.
 */
export const PAIR_TOLERANCE_MS = 10_000;

export interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface PairedSample {
  ts: number;
  a: number;
  b: number;
}

/**
 * Joins two independently-timestamped numeric series into paired observations.
 *
 * Walks both in lockstep rather than searching per point, so a few thousand samples stay linear.
 * Both are sorted first: the API returns newest-first, and the walk assumes ascending order.
 * Non-numeric values are dropped rather than yielding NaN coordinates downstream.
 *
 * Shared by every widget that plots one key against another — the position heatmap and the
 * scatter chart both need this exact join, and both were written with a naive `Map` lookup on
 * equal timestamps before it was factored out.
 */
export function pairSeries(seriesA: TelemetryValue[], seriesB: TelemetryValue[]): PairedSample[] {
  const a = [...seriesA].sort((x, y) => x.ts - y.ts);
  const b = [...seriesB].sort((x, y) => x.ts - y.ts);
  const paired: PairedSample[] = [];

  let j = 0;
  for (const pointA of a) {
    // Advance the B cursor while the next sample is a closer match for this A sample.
    while (j + 1 < b.length && Math.abs(b[j + 1].ts - pointA.ts) <= Math.abs(b[j].ts - pointA.ts)) {
      j += 1;
    }
    const pointB = b[j];
    if (!pointB || Math.abs(pointB.ts - pointA.ts) > PAIR_TOLERANCE_MS) continue;

    const valueA = Number(pointA.value);
    const valueB = Number(pointB.value);
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) continue;
    paired.push({ ts: pointA.ts, a: valueA, b: valueB });
  }

  return paired;
}

/**
 * Pairs latitude and longitude series into position fixes for the movement heatmap.
 *
 * Every fix weighs the same: the heat is time spent in a place, and overlapping points
 * accumulate on their own.
 */
export function pairCoordinates(latitude: TelemetryValue[], longitude: TelemetryValue[]): HeatPoint[] {
  return pairSeries(latitude, longitude).map(({ a, b }) => ({ lat: a, lng: b, intensity: 1 }));
}
