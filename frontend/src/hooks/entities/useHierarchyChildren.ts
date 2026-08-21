import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import type { EntityRef } from '@/types';

export interface HierarchyChildren {
  assets: EntityRef[];
  devices: EntityRef[];
}

export function useCustomerChildren(customerId?: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'children'],
    queryFn: () => apiClient.get<HierarchyChildren>(`/customers/${customerId}/children`),
    enabled: !!customerId,
  });
}

export function useAssetChildren(assetId?: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'children'],
    queryFn: () => apiClient.get<HierarchyChildren>(`/assets/${assetId}/children`),
    enabled: !!assetId,
  });
}

/** Invalidates the right children query for whichever node (Customer or Asset) a mutation just affected. */
export function useInvalidateHierarchyChildren() {
  const queryClient = useQueryClient();
  return (node: { id: string; type: 'CUSTOMER' | 'ASSET' }) => {
    const key = node.type === 'CUSTOMER' ? ['customers', node.id, 'children'] : ['assets', node.id, 'children'];
    queryClient.invalidateQueries({ queryKey: key });
  };
}
