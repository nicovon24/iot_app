import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EntityRef } from '@/types';

export function usePatchDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { label: string } }) =>
      apiClient.patch<EntityRef>(`/devices/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'DEVICE'] });
    },
  });
}
