'use client';

import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EntityRef, TelemetryLatest } from '@/types';

/** Telemetry columns are polled rather than pushed. See useLiveTelemetry for the socket route. */
export const TELEMETRY_POLL_MS = 5_000;

export interface CellValue {
  value?: string;
  ts?: number;
}

/** Latest value of one telemetry key for each entity, keyed by entity id. Shares query keys
 * with useTelemetryLatest so single- and multi-entity widgets hit the same cache entries. */
export function useLatestForEntities(entities: EntityRef[], entityType: 'DEVICE' | 'ASSET', key: string | undefined) {
  const keys = key ? [key] : undefined;
  const results = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['telemetry', 'latest', entity.id, keys],
      queryFn: () =>
        apiClient.get<TelemetryLatest>(
          `/entities/${entity.id}/telemetry/latest?type=${entityType}${key ? `&keys=${key}` : ''}`,
        ),
      enabled: Boolean(key),
    })),
  });

  const byEntity: Record<string, { value?: string; ts?: number }> = {};
  entities.forEach((entity, i) => {
    const point = key ? results[i]?.data?.[key] : undefined;
    byEntity[entity.id] = { value: point?.value, ts: point?.ts };
  });

  return { byEntity, isLoading: results.some((r) => r.isLoading) };
}

/**
 * Latest value of *several* telemetry keys per entity, for the Value Cards widget. Requests
 * all keys at once per entity rather than one query per (entity, key) pair — the endpoint
 * already returns the full latest set, so N entities cost N requests instead of N×K.
 */
export function useMultiKeyLatestForEntities(
  entities: EntityRef[],
  entityType: 'DEVICE' | 'ASSET',
  keys: string[],
) {
  const results = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['telemetry', 'latest', entity.id, undefined],
      queryFn: () => apiClient.get<TelemetryLatest>(`/entities/${entity.id}/telemetry/latest?type=${entityType}`),
      enabled: keys.length > 0,
      refetchInterval: TELEMETRY_POLL_MS,
    })),
  });

  const byEntity: Record<string, Record<string, CellValue>> = {};
  entities.forEach((entity, i) => {
    const latest = results[i]?.data ?? {};
    const row: Record<string, CellValue> = {};
    for (const key of keys) {
      const point = latest[key];
      row[key] = point ? { value: point.value, ts: point.ts } : {};
    }
    byEntity[entity.id] = row;
  });

  return { byEntity, isLoading: results.some((r) => r.isLoading) };
}
