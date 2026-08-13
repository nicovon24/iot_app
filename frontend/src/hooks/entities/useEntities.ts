import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EntityRef, EntityType, PageData } from '@/types';

export interface UseEntitiesParams {
  page?: number;
  pageSize?: number;
  textSearch?: string;
  sortProperty?: string;
  sortOrder?: 'ASC' | 'DESC';
}

const ENTITY_LIST_PATH: Record<'DEVICE' | 'ASSET' | 'CUSTOMER', string> = {
  DEVICE: 'devices',
  ASSET: 'assets',
  CUSTOMER: 'customers',
};

function buildQueryString(params?: UseEntitiesParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.pageSize !== undefined) search.set('pageSize', String(params.pageSize));
  if (params.textSearch) search.set('textSearch', params.textSearch);
  if (params.sortProperty) search.set('sortProperty', params.sortProperty);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export interface UseEntitiesOptions {
  /** Skip the request entirely — e.g. a widget bound to one entity has no use for the list. */
  enabled?: boolean;
  /** Poll interval in ms. Used by "all entities" widgets so a newly registered device shows
   * up on its own, without the user reopening the dashboard. */
  refetchInterval?: number;
}

// Options are deliberately a separate argument from `params`: `params` is part of the query
// key (it changes *what* is fetched), options only change *when*, so folding them together
// would fragment the cache across callers that want the same data on different schedules.
export function useEntities(
  type: Extract<EntityType, 'DEVICE' | 'ASSET' | 'CUSTOMER'>,
  params?: UseEntitiesParams,
  options?: UseEntitiesOptions,
) {
  return useQuery({
    queryKey: ['entities', type, params],
    queryFn: () => apiClient.get<PageData<EntityRef>>(`/${ENTITY_LIST_PATH[type]}${buildQueryString(params)}`),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}
