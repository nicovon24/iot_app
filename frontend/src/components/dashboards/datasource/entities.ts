'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib';
import { useEntities } from '@/hooks';
import type { EntityRef, WidgetDatasource } from '@/types';

export type { WidgetDatasource } from '@/types';

/** How often an "all entities" widget re-checks the entity list. New devices appear within
 * this window with no user action — that's the whole point of storing a filter instead of ids. */
const ENTITY_LIST_POLL_MS = 60_000;
const ENTITY_LIST_PAGE_SIZE = 200;

const LIST_PATH: Record<'DEVICE' | 'ASSET', string> = { DEVICE: 'devices', ASSET: 'assets' };

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
