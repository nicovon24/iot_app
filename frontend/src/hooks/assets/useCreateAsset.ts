import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import type { EntityRef } from '@/types';
import type { CreateAssetRequest } from '@/types';

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAssetRequest) => apiClient.post<EntityRef>('/assets', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'ASSET'] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'ASSET'] });
    },
  });
}
