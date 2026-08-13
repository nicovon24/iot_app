'use client';

import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@\/lib';
import type { Attribute, AttributeScope, EntityRef, TelemetryLatest } from '@/types';
import { TELEMETRY_POLL_MS, type CellValue } from './latest';

export const ATTRIBUTE_SCOPES: AttributeScope[] = ['CLIENT_SCOPE', 'SERVER_SCOPE', 'SHARED_SCOPE'];

export const ATTRIBUTE_SCOPE_LABELS: Record<AttributeScope, string> = {
  CLIENT_SCOPE: 'Client attributes',
  SERVER_SCOPE: 'Server attributes',
  SHARED_SCOPE: 'Shared attributes',
};

/** Wildcard key meaning "every key of this source/scope" — see the backend dataKey schema. */
export const ALL_KEYS = '*';

/** One configured column of a table widget. Mirrors backend/src/dashboards/widget-registry.ts. */
export type DataKey =
  | { source: 'ATTRIBUTE'; scope: AttributeScope; key: string }
  | { source: 'TELEMETRY'; key: string };

/** A dataKey after wildcards have been expanded against what the entities actually report. */
export interface ResolvedColumn {
  /** Stable identity — an attribute and a telemetry series may share a name. */
  id: string;
  label: string;
  source: 'ATTRIBUTE' | 'TELEMETRY';
  scope?: AttributeScope;
  key: string;
}

function columnId(source: string, key: string, scope?: AttributeScope) {
  return `${source}:${scope ?? ''}:${key}`;
}

/**
 * Fetches everything a table widget needs and resolves its configured dataKeys into concrete
 * columns plus a value per (entity, column).
 *
 * Attributes and telemetry are fetched wholesale per entity rather than per configured key:
 * a wildcard needs the full key list anyway, and it keeps these sharing cache entries with
 * the single-entity views (['attributes', id] / ['telemetry','latest', id, undefined]).
 */
export function useEntityTableData(
  entities: EntityRef[],
  entityType: 'DEVICE' | 'ASSET',
  dataKeys: DataKey[] | undefined,
) {
  // No fallback to "every attribute": a table with nothing configured renders empty and says so,
  // which is the honest state. Dumping all three attribute scopes was unusable as a default.
  const configured = dataKeys ?? [];
  const needsAttributes = configured.some((k) => k.source === 'ATTRIBUTE');
  const needsTelemetry = configured.some((k) => k.source === 'TELEMETRY');

  const attributeResults = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['attributes', entity.id],
      queryFn: async () => {
        const perScope = await Promise.all(
          ATTRIBUTE_SCOPES.map((scope) =>
            apiClient.get<Attribute[]>(`/entities/${entity.id}/attributes?type=${entityType}&scope=${scope}`),
          ),
        );
        return { CLIENT_SCOPE: perScope[0], SERVER_SCOPE: perScope[1], SHARED_SCOPE: perScope[2] };
      },
      enabled: needsAttributes,
    })),
  });

  const telemetryResults = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['telemetry', 'latest', entity.id, undefined],
      queryFn: () => apiClient.get<TelemetryLatest>(`/entities/${entity.id}/telemetry/latest?type=${entityType}`),
      enabled: needsTelemetry,
      refetchInterval: TELEMETRY_POLL_MS,
    })),
  });

  const attributesByEntity: Record<string, Partial<Record<AttributeScope, Attribute[]>>> = {};
  const telemetryByEntity: Record<string, TelemetryLatest> = {};
  entities.forEach((entity, i) => {
    attributesByEntity[entity.id] = attributeResults[i]?.data ?? {};
    telemetryByEntity[entity.id] = telemetryResults[i]?.data ?? {};
  });

  // Wildcards expand against the union across entities, so a key only some entities report
  // still gets a column — blank for the ones that don't have it.
  const attributeKeysInScope = (scope: AttributeScope) =>
    Array.from(
      new Set(entities.flatMap((e) => (attributesByEntity[e.id]?.[scope] ?? []).map((a) => a.key))),
    ).sort();
  const allTelemetryKeys = Array.from(
    new Set(entities.flatMap((e) => Object.keys(telemetryByEntity[e.id] ?? {}))),
  ).sort();

  const columns: ResolvedColumn[] = [];
  const seen = new Set<string>();
  const push = (column: ResolvedColumn) => {
    if (seen.has(column.id)) return;
    seen.add(column.id);
    columns.push(column);
  };

  for (const entry of configured) {
    if (entry.source === 'ATTRIBUTE') {
      const keys = entry.key === ALL_KEYS ? attributeKeysInScope(entry.scope) : [entry.key];
      for (const key of keys) {
        push({
          id: columnId('ATTRIBUTE', key, entry.scope),
          label: key,
          source: 'ATTRIBUTE',
          scope: entry.scope,
          key,
        });
      }
    } else {
      const keys = entry.key === ALL_KEYS ? allTelemetryKeys : [entry.key];
      for (const key of keys) {
        push({ id: columnId('TELEMETRY', key), label: key, source: 'TELEMETRY', key });
      }
    }
  }

  const valuesByEntity: Record<string, Record<string, CellValue>> = {};
  for (const entity of entities) {
    const row: Record<string, CellValue> = {};
    for (const column of columns) {
      if (column.source === 'ATTRIBUTE') {
        const found = (attributesByEntity[entity.id]?.[column.scope as AttributeScope] ?? []).find(
          (a) => a.key === column.key,
        );
        row[column.id] = found ? { value: String(found.value), ts: found.lastUpdateTs } : {};
      } else {
        const point = telemetryByEntity[entity.id]?.[column.key];
        row[column.id] = point ? { value: point.value, ts: point.ts } : {};
      }
    }
    valuesByEntity[entity.id] = row;
  }

  return {
    columns,
    valuesByEntity,
    isLoading:
      (needsAttributes && attributeResults.some((r) => r.isLoading)) ||
      (needsTelemetry && telemetryResults.some((r) => r.isLoading)),
  };
}
