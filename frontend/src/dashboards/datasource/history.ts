'use client';

import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DashboardTimeWindow, EntityRef, TelemetryValue } from '@/types';

const ONE_HOUR_MS = 3_600_000;

/**
 * Buckets a chart aims for. Above roughly this many points a line is denser than the pixels
 * available to draw it, so a finer interval costs bandwidth and buys nothing.
 */
const TARGET_BUCKETS = 500;

/** Bucket sizes the interval snaps to, so a window resize lands on a round number a human
 * recognises (5 minutes, an hour, a day) rather than an arbitrary 7m13s. */
const INTERVAL_STEPS = [
  60_000, // 1 minute
  300_000, // 5 minutes
  900_000, // 15 minutes
  1_800_000, // 30 minutes
  3_600_000, // 1 hour
  10_800_000, // 3 hours
  21_600_000, // 6 hours
  43_200_000, // 12 hours
  86_400_000, // 1 day
  604_800_000, // 1 week
];

/**
 * Picks an aggregation bucket that suits the window's length.
 *
 * A fixed interval breaks at both ends of the range: five-minute buckets over 90 days asks
 * ThingsBoard for ~26,000 buckets per entity, which it rejects outright with a 400 — the failure
 * that surfaced as soon as the 30- and 90-day presets existed. The bucket has to scale with the
 * span, not stay pinned to whatever suited an hour.
 */
export function intervalForWindow(window: { startTs: number; endTs: number }): number {
  const span = Math.max(0, window.endTs - window.startTs);
  const ideal = span / TARGET_BUCKETS;
  return INTERVAL_STEPS.find((step) => step >= ideal) ?? INTERVAL_STEPS[INTERVAL_STEPS.length - 1];
}

/** Timeseries history of one key per entity, for multi-series charts. The time window is
 * computed once per call site (not per render) for the same reason useTelemetryHistory
 * memoizes it: a moving window makes a new query key every render and never settles. */
export function useHistoryForEntities(
  entities: EntityRef[],
  entityType: 'DEVICE' | 'ASSET',
  key: string | undefined,
  window: { startTs: number; endTs: number },
  options?: { agg?: string; interval?: number },
) {
  const agg = options?.agg ?? 'AVG';
  // Derived from the span unless the widget pins one: a fixed bucket either overwhelms a long
  // window or wastes resolution on a short one.
  const interval = options?.interval ?? intervalForWindow(window);

  const results = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['telemetry', 'history', entity.id, key, window.startTs, window.endTs, agg, interval],
      queryFn: async (): Promise<TelemetryValue[]> => {
        const params = new URLSearchParams({
          type: entityType,
          keys: key as string,
          startTs: String(window.startTs),
          endTs: String(window.endTs),
          agg,
          interval: String(interval),
        });
        const result = await apiClient.get<Record<string, TelemetryValue[]>>(
          `/entities/${entity.id}/telemetry/timeseries?${params.toString()}`,
        );
        return result[key as string] ?? [];
      },
      enabled: Boolean(key),
    })),
  });

  const byEntity: Record<string, TelemetryValue[]> = {};
  entities.forEach((entity, i) => {
    byEntity[entity.id] = results[i]?.data ?? [];
  });

  return { byEntity, isLoading: results.some((r) => r.isLoading) };
}

/**
 * Timeseries history of several keys for one entity, for the timeseries table.
 *
 * One request per entity carrying every key, rather than reusing useHistoryForEntities per key:
 * the endpoint already returns a `Record<key, TelemetryValue[]>`, so asking for three keys costs
 * one round trip instead of three. Same window-memoization requirement as useHistoryForEntities.
 */
export function useMultiKeyHistoryForEntities(
  entities: EntityRef[],
  entityType: 'DEVICE' | 'ASSET',
  keys: string[],
  window: { startTs: number; endTs: number },
  options?: { agg?: string; interval?: number },
) {
  const agg = options?.agg ?? 'AVG';
  const interval = options?.interval ?? intervalForWindow(window);
  const keyList = keys.join(',');

  const results = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['telemetry', 'history', entity.id, keyList, window.startTs, window.endTs, agg, interval],
      queryFn: async (): Promise<Record<string, TelemetryValue[]>> => {
        const params = new URLSearchParams({
          type: entityType,
          keys: keyList,
          startTs: String(window.startTs),
          endTs: String(window.endTs),
          agg,
          interval: String(interval),
        });
        return apiClient.get<Record<string, TelemetryValue[]>>(
          `/entities/${entity.id}/telemetry/timeseries?${params.toString()}`,
        );
      },
      enabled: keys.length > 0,
    })),
  });

  const byEntity: Record<string, Record<string, TelemetryValue[]>> = {};
  entities.forEach((entity, i) => {
    byEntity[entity.id] = results[i]?.data ?? {};
  });

  return { byEntity, isLoading: results.some((r) => r.isLoading) };
}

/** Ceiling on raw points fetched per entity for a position trail. ThingsBoard returns only 100
 * points when `limit` is unset — silently, which would draw a trail of the last few minutes and
 * look like a working heatmap. This asks for enough to cover a real window while staying a
 * bounded request. */
const RAW_POINT_LIMIT = 5_000;

/**
 * Raw (unaggregated) history of several keys per entity — for position trails, where averaging
 * is actively wrong: the mean of two coordinates is a place the sensor never was.
 *
 * Deliberately omits `agg`/`interval` rather than passing agg: 'NONE'. The backend only forwards
 * an aggregation when both are present, so leaving them out is what makes ThingsBoard return
 * stored points as they were written.
 */
export function useRawHistoryForEntities(
  entities: EntityRef[],
  entityType: 'DEVICE' | 'ASSET',
  keys: string[],
  window: { startTs: number; endTs: number },
) {
  const keyList = keys.join(',');

  const results = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['telemetry', 'history-raw', entity.id, keyList, window.startTs, window.endTs],
      queryFn: async (): Promise<Record<string, TelemetryValue[]>> => {
        const params = new URLSearchParams({
          type: entityType,
          keys: keyList,
          startTs: String(window.startTs),
          endTs: String(window.endTs),
          limit: String(RAW_POINT_LIMIT),
        });
        return apiClient.get<Record<string, TelemetryValue[]>>(
          `/entities/${entity.id}/telemetry/timeseries?${params.toString()}`,
        );
      },
      enabled: keys.length > 0,
    })),
  });

  const byEntity: Record<string, Record<string, TelemetryValue[]>> = {};
  entities.forEach((entity, i) => {
    byEntity[entity.id] = results[i]?.data ?? {};
  });

  return { byEntity, isLoading: results.some((r) => r.isLoading) };
}

/**
 * Turns a dashboard's configured window into the concrete bounds a timeseries query needs.
 *
 * `null` falls back to a rolling hour — the behaviour every chart had before dashboards could
 * carry a window, so a dashboard saved before 10-04 renders exactly as it used to.
 *
 * A LAST window is resolved against `Date.now()` *here*, which means the result changes every
 * call. Callers must memoize it (see LineChartCell) — recomputing it each render regenerates
 * the TanStack query key and the query never settles, the bug already documented in
 * useTelemetryHistory.
 */
export function resolveHistoryWindow(
  timeWindow?: DashboardTimeWindow | null,
): { startTs: number; endTs: number } {
  if (timeWindow?.kind === 'FIXED') {
    return { startTs: timeWindow.startTs, endTs: timeWindow.endTs };
  }
  const endTs = Date.now();
  return { startTs: endTs - (timeWindow?.kind === 'LAST' ? timeWindow.ms : ONE_HOUR_MS), endTs };
}
