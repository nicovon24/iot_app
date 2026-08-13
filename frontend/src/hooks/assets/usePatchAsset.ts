import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EntityRef } from '@/types';

export interface PatchAssetRequest {
  name?: string;
  type?: string;
  label?: string;
}

export function usePatchAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: PatchAssetRequest }) =>
      apiClient.patch<EntityRef>(`/assets/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'ASSET'] });
    },
  });
}
