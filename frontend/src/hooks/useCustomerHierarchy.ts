import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { HierarchyLevel } from '@/types/customer';

export function useCustomerHierarchy(customerId?: string) {
  return useQuery({
    queryKey: ['customers', customerId, 'hierarchy'],
    queryFn: () => apiClient.get<HierarchyLevel[]>(`/customers/${customerId}/hierarchy`),
    enabled: !!customerId,
  });
}
