import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import type { EntityRef, CreateUserRequest } from '@/types';

export type { CreateUserRequest } from '@/types';

/** `customerId` undefined means "every Customer User in the tenant" — the page's default view. */
export function useUsers(customerId: string | undefined) {
  return useQuery({
    queryKey: ['users', customerId ?? 'all'],
    queryFn: () => apiClient.get<EntityRef[]>(customerId ? `/users?customerId=${customerId}` : '/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserRequest) => apiClient.post<EntityRef>('/users', dto),
    onSuccess: () => {
      // Prefix match invalidates every ['users', *] view (a specific customer and "all") at once.
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
