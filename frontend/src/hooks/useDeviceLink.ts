import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useLinkDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, deviceId }: { assetId: string; deviceId: string }) =>
      apiClient.post<void>(`/assets/${assetId}/devices`, { deviceId }),
    onSuccess: (_data, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ['assets', assetId, 'children'] });
    },
  });
}

export function useUnlinkDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, deviceId }: { assetId: string; deviceId: string }) =>
      apiClient.delete<void>(`/assets/${assetId}/devices/${deviceId}`),
    onSuccess: (_data, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ['assets', assetId, 'children'] });
    },
  });
}
