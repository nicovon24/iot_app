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

const ENTITY_LIST_PATH: Record<'DEVICE' | 'ASSET', string> = {
  DEVICE: 'devices',
  ASSET: 'assets',
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

export function useEntities(type: Extract<EntityType, 'DEVICE' | 'ASSET'>, params?: UseEntitiesParams) {
  return useQuery({
    queryKey: ['entities', type, params],
    queryFn: () => apiClient.get<PageData<EntityRef>>(`/${ENTITY_LIST_PATH[type]}${buildQueryString(params)}`),
  });
}
