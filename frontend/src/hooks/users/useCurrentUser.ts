import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import { getSessionToken } from '@/lib';
import type { CurrentUser } from '@/types';

export type { CurrentUser } from '@/types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<CurrentUser>('/auth/me'),
    enabled: !!getSessionToken(),
    staleTime: Infinity,
  });
}

/**
 * Derived write-permission helpers. `isReader`/`isSysadmin`/`canWrite` all key off `data` being
 * present, not `isLoading` — `isLoading` (`isPending && isFetching` in TanStack Query v5) can be
 * `false` on the very first render (e.g. before the fetch effect has run) while `data` is still
 * `undefined`, which would otherwise let `canWrite` resolve `true` for an instant. Gating on
 * `data` itself keeps write controls hidden/disabled until a real role is known, with no flash.
 */
export function usePermissions() {
  const { data, isLoading } = useCurrentUser();
  const isReader = data?.appRole === 'READER';
  const isSysadmin = data?.authority === 'TENANT_ADMIN' || data?.authority === 'SYS_ADMIN';
  return {
    isLoading,
    isReader,
    isSysadmin,
    /** ADMIN and SYSADMIN can write; READER cannot. `false` until `/auth/me` resolves. */
    canWrite: !!data && !isReader,
  };
}
