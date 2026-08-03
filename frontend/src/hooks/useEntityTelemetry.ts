import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EntityType, TelemetryLatest, TelemetryValue } from '@/types';

const ONE_HOUR_MS = 3600_000;

export function useTelemetryKeys(id: string, type: EntityType) {
  return useQuery({
    queryKey: ['telemetry', 'keys', id],
    queryFn: () => apiClient.get<string[]>(`/entities/${id}/telemetry/keys?type=${type}`),
  });
}

export function useTelemetryLatest(id: string, type: EntityType, keys?: string[]) {
  const keysParam = keys && keys.length > 0 ? `&keys=${keys.join(',')}` : '';
  return useQuery({
    queryKey: ['telemetry', 'latest', id, keys],
    queryFn: () => apiClient.get<TelemetryLatest>(`/entities/${id}/telemetry/latest?type=${type}${keysParam}`),
  });
}

export interface UseTelemetryHistoryOptions {
  startTs?: number;
  endTs?: number;
  agg?: 'MIN' | 'MAX' | 'AVG' | 'SUM' | 'COUNT' | 'NONE';
  interval?: number;
}

export function useTelemetryHistory(
  id: string,
  type: EntityType,
  key: string | undefined,
  options?: UseTelemetryHistoryOptions,
) {
  const agg = options?.agg ?? 'AVG';
  const interval = options?.interval ?? 300_000;
  const optEndTs = options?.endTs;
  const optStartTs = options?.startTs;

  // Computed once per `key` (not on every render) — recomputing Date.now() on
  // every render (e.g. triggered by live WS frames re-rendering the page)
  // produced a new queryKey each time, so the query never settled and always
  // showed "no data yet" while chasing a moving time window.
  const { startTs, endTs } = useMemo(() => {
    const end = optEndTs ?? Date.now();
    const start = optStartTs ?? end - ONE_HOUR_MS;
    return { startTs: start, endTs: end };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, optStartTs, optEndTs]);

  return useQuery({
    queryKey: ['telemetry', 'history', id, key, startTs, endTs, agg, interval],
    queryFn: async (): Promise<TelemetryValue[]> => {
      const params = new URLSearchParams({
        type,
        keys: key as string,
        startTs: String(startTs),
        endTs: String(endTs),
        agg,
        interval: String(interval),
      });
      const result = await apiClient.get<Record<string, TelemetryValue[]>>(
        `/entities/${id}/telemetry/timeseries?${params.toString()}`,
      );
      return result[key as string] ?? [];
    },
    enabled: Boolean(key),
  });
}
