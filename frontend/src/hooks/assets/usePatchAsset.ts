import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import type { EntityRef, PatchAssetRequest } from '@/types';

export type { PatchAssetRequest } from '@/types';

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
