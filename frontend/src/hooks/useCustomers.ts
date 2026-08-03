import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useEntities } from './useEntities';
import type { EntityRef } from '@/types';
import type { CreateCustomerRequest } from '@/types/customer';

export function useCustomers() {
  return useEntities('CUSTOMER');
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCustomerRequest) => apiClient.post<EntityRef>('/customers', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'CUSTOMER'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'CUSTOMER'] });
    },
  });
}
