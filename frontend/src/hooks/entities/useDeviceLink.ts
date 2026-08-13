import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@\/lib';
import type { EntityRef } from '@/types';

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

/** Customer-User-only: claims a Device ThingsBoard never assigned to any real Customer
 * into the caller's own customer, so it becomes linkable via useLinkDevice afterwards. */
export function useClaimDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => apiClient.post<EntityRef>(`/devices/${deviceId}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'DEVICE'] });
    },
  });
}
