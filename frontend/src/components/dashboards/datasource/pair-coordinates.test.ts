/**
 * Coordinate pairing — the logic that silently emptied the movement heatmap when it required
 * exact timestamp equality.
 */
import { describe, expect, it } from 'vitest';
import { pairCoordinates, pairSeries } from './pair-coordinates';

const at = (ts: number, value: string) => ({ ts, value });
const T = 1_700_000_000_000;

describe('pairCoordinates', () => {
  it('pairs a few ms of skew', () => {
    expect(pairCoordinates([at(T, '10')], [at(T + 40, '20')]).length).toBe(1);
  });

  it('pairs exact-timestamp matches', () => {
    expect(pairCoordinates([at(T, '10')], [at(T, '20')])).toEqual([
      { lat: 10, lng: 20, intensity: 1 },
    ]);
  });

  it('does not glue together two fixes a minute apart', () => {
    expect(pairCoordinates([at(T, '10')], [at(T + 60_000, '20')]).length).toBe(0);
  });

  it('pairs each latitude with its own nearest longitude sample', () => {
    const paired = pairCoordinates(
      [at(T, '1'), at(T + 5_000, '2')],
      [at(T + 10, '10'), at(T + 5_010, '20')],
    );
    expect(paired).toEqual([
      { lat: 1, lng: 10, intensity: 1 },
      { lat: 2, lng: 20, intensity: 1 },
    ]);
  });

  it('sorts newest-first input (the API’s real order) before pairing', () => {
    expect(
      pairCoordinates([at(T + 5_000, '2'), at(T, '1')], [at(T + 5_000, '20'), at(T, '10')]).length,
    ).toBe(2);
  });

  it('produces no points from one-sided or non-numeric data, never NaN coordinates', () => {
    expect(pairCoordinates([at(T, '10')], []).length).toBe(0);
    expect(pairCoordinates([], [at(T, '20')]).length).toBe(0);
    expect(pairCoordinates([at(T, 'NORTH')], [at(T, '20')]).length).toBe(0);
  });
});

describe('pairSeries', () => {
  it('pairs skewed samples of two different telemetry keys', () => {
    expect(pairSeries([at(T, '-70')], [at(T + 35, '12')])).toEqual([{ ts: T, a: -70, b: 12 }]);
  });

  it('treats samples a minute apart as separate observations', () => {
    expect(pairSeries([at(T, '-70')], [at(T + 60_000, '12')]).length).toBe(0);
  });

  it('pairs unsorted input with each sample’s nearest counterpart', () => {
    expect(
      pairSeries([at(T, '1'), at(T + 5_000, '2')], [at(T + 5_010, '20'), at(T + 10, '10')]),
    ).toEqual([
      { ts: T, a: 1, b: 10 },
      { ts: T + 5_000, a: 2, b: 20 },
    ]);
  });

  it('drops non-numeric samples', () => {
    expect(pairSeries([at(T, 'ON')], [at(T, '5')]).length).toBe(0);
  });
});
