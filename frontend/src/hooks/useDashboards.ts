import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Dashboard, SaveDashboardInput } from '@/types';

export function useDashboards() {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: () => apiClient.get<Dashboard[]>('/dashboards'),
  });
}

export function useDashboard(id: string | undefined) {
  return useQuery({
    queryKey: ['dashboards', id],
    queryFn: () => apiClient.get<Dashboard>(`/dashboards/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SaveDashboardInput) => apiClient.post<Dashboard>('/dashboards', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export function useSaveDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SaveDashboardInput }) =>
      apiClient.put<Dashboard>(`/dashboards/${id}`, dto),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboards', id] });
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/dashboards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}
