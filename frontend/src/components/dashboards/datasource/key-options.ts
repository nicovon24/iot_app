'use client';

import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@\/lib';
import type { Attribute, AttributeScope } from '@/types';
import { ATTRIBUTE_SCOPES } from './table';

/** Entities sampled to discover which telemetry keys a fleet reports. Asking all 200 would be
 * 200 requests to fill one dropdown; a fleet's key set is near-homogeneous, so a sample finds
 * effectively the same union at a fraction of the cost. */
const KEY_DISCOVERY_SAMPLE = 25;

/** Key options for the picker, per source, discovered from a sample of the fleet. */
export function useDataKeyOptions(entityIds: string[], entityType: 'DEVICE' | 'ASSET') {
  const sample = entityIds.slice(0, KEY_DISCOVERY_SAMPLE);

  const attributeResults = useQueries({
    queries: sample.map((id) => ({
      queryKey: ['attributes', id],
      queryFn: async () => {
        const perScope = await Promise.all(
          ATTRIBUTE_SCOPES.map((scope) =>
            apiClient.get<Attribute[]>(`/entities/${id}/attributes?type=${entityType}&scope=${scope}`),
          ),
        );
        return { CLIENT_SCOPE: perScope[0], SERVER_SCOPE: perScope[1], SHARED_SCOPE: perScope[2] };
      },
    })),
  });

  const telemetry = useTelemetryKeyOptions(entityIds, entityType);

  const attributeKeys: Record<AttributeScope, string[]> = {
    CLIENT_SCOPE: [],
    SERVER_SCOPE: [],
    SHARED_SCOPE: [],
  };
  for (const scope of ATTRIBUTE_SCOPES) {
    attributeKeys[scope] = Array.from(
      new Set(attributeResults.flatMap((r) => (r.data?.[scope] ?? []).map((a) => a.key))),
    ).sort();
  }

  return {
    attributeKeys,
    telemetryKeys: telemetry.keys,
    isLoading: attributeResults.some((r) => r.isLoading) || telemetry.isLoading,
  };
}

/**
 * Union of telemetry keys across the given entities — the options for a "which key?" picker.
 * Union rather than intersection so a key only some entities report is still offerable; the
 * widget then simply has no series for the entities that don't report it.
 *
 * `sampleSize` exists because callers want different guarantees: a dropdown only needs a
 * representative union (sample), while bulk-add uses `keysByEntity` to decide which (entity,
 * key) pairs to actually create and must therefore see every selected entity.
 */
export function useTelemetryKeyOptions(
  entityIds: string[],
  entityType: 'DEVICE' | 'ASSET',
  sampleSize: number = KEY_DISCOVERY_SAMPLE,
) {
  const sample = entityIds.slice(0, sampleSize);
  const results = useQueries({
    queries: sample.map((id) => ({
      queryKey: ['telemetry', 'keys', id],
      queryFn: () => apiClient.get<string[]>(`/entities/${id}/telemetry/keys?type=${entityType}`),
    })),
  });

  const keysByEntity: Record<string, string[]> = {};
  sample.forEach((id, i) => {
    keysByEntity[id] = results[i]?.data ?? [];
  });

  return {
    keysByEntity,
    keys: Array.from(new Set(Object.values(keysByEntity).flat())).sort(),
    isLoading: results.some((r) => r.isLoading),
  };
}
