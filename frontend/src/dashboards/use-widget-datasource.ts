'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';
import { useEntities } from '@/hooks/useEntities';
import type {
  Attribute,
  AttributeScope,
  DashboardTimeWindow,
  EntityRef,
  TelemetryLatest,
  TelemetryValue,
} from '@/types';

/** How often an "all entities" widget re-checks the entity list. New devices appear within
 * this window with no user action — that's the whole point of storing a filter instead of ids. */
const ENTITY_LIST_POLL_MS = 60_000;
const ENTITY_LIST_PAGE_SIZE = 200;
const ONE_HOUR_MS = 3_600_000;

const LIST_PATH: Record<'DEVICE' | 'ASSET', string> = { DEVICE: 'devices', ASSET: 'assets' };

/** The datasource half of every widget config — see backend/src/dashboards/widget-registry.ts. */
export interface WidgetDatasource {
  entityId?: string;
  entityScope?: 'ALL';
  entityType?: 'DEVICE' | 'ASSET';
}

export function isAllScope(config: WidgetDatasource): boolean {
  return config.entityScope === 'ALL';
}

/**
 * Resolves a widget's datasource to the entities it should render, whichever shape it uses.
 *
 * Single-entity configs resolve to a one-element list, so every multi-entity widget can be
 * written once against a list instead of branching on scope. `notFound` is only meaningful
 * for the single-entity case — an ALL-scope widget with zero entities isn't an error, it's
 * an empty fleet.
 */
export function useDatasourceEntities(config: WidgetDatasource): {
  entities: EntityRef[];
  isLoading: boolean;
  notFound: boolean;
} {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';

  const listQuery = useEntities(
    entityType,
    { pageSize: ENTITY_LIST_PAGE_SIZE },
    { enabled: all, refetchInterval: ENTITY_LIST_POLL_MS },
  );

  const singleQuery = useQuery({
    queryKey: ['entity', config.entityId, entityType],
    queryFn: () => apiClient.get<EntityRef>(`/${LIST_PATH[entityType]}/${config.entityId}`),
    enabled: !all && Boolean(config.entityId),
    retry: false,
  });

  if (all) {
    return { entities: listQuery.data?.data ?? [], isLoading: listQuery.isLoading, notFound: false };
  }

  return {
    entities: singleQuery.data ? [singleQuery.data] : [],
    isLoading: singleQuery.isLoading,
    notFound: singleQuery.isError && singleQuery.error instanceof ApiError && singleQuery.error.status === 404,
  };
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
  const interval = options?.interval ?? 300_000;

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

export interface CellValue {
  value?: string;
  ts?: number;
}

/** Telemetry columns are polled rather than pushed. See useLiveTelemetry for the socket route. */
const TELEMETRY_POLL_MS = 5_000;

/** With nothing configured a table shows every attribute, which is what it did before dataKeys
 * existed — so an already-saved widget keeps rendering the same content. */
export const DEFAULT_DATA_KEYS: DataKey[] = ATTRIBUTE_SCOPES.map((scope) => ({
  source: 'ATTRIBUTE' as const,
  scope,
  key: ALL_KEYS,
}));

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
  const configured = dataKeys && dataKeys.length > 0 ? dataKeys : DEFAULT_DATA_KEYS;
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

/** Entities sampled to discover which telemetry keys a fleet reports. Asking all 200 would be
 * 200 requests to fill one dropdown; a fleet's key set is near-homogeneous, so a sample finds
 * effectively the same union at a fraction of the cost. */
const KEY_DISCOVERY_SAMPLE = 25;

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
