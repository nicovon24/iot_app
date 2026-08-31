import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import type { Alarm, AlarmSeverity, AlarmStatus, EntityType, PageData } from '@/types';

export function useEntityAlarms(id: string, type: EntityType) {
  return useQuery({
    queryKey: ['alarms', 'entity', id],
    queryFn: () => apiClient.get<PageData<Alarm>>(`/entities/${id}/alarms?type=${type}`),
    // Callers pass `entityId ?? ''` when nothing is scoped yet; without this that requests
    // `/entities//alarms` and caches a junk entry.
    enabled: Boolean(id),
  });
}

export interface UseGlobalAlarmsParams {
  severity?: AlarmSeverity;
  status?: AlarmStatus;
  /** Restrict to alarms raised by devices or by assets. Omitted = both. */
  entityType?: 'DEVICE' | 'ASSET';
  page?: number;
  pageSize?: number;
}

export function useGlobalAlarms(params: UseGlobalAlarmsParams) {
  return useQuery({
    queryKey: ['alarms', 'global', params],
    queryFn: () => {
      const search = new URLSearchParams();
      if (params.severity) search.set('severity', params.severity);
      if (params.status) search.set('status', params.status);
      if (params.entityType) search.set('entityType', params.entityType);
      if (params.page !== undefined) search.set('page', String(params.page));
      if (params.pageSize !== undefined) search.set('pageSize', String(params.pageSize));
      const qs = search.toString();
      return apiClient.get<PageData<Alarm>>(`/alarms${qs ? `?${qs}` : ''}`);
    },
  });
}
