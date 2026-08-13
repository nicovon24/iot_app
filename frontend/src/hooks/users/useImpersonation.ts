import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@\/lib';
import { startImpersonationSession, endImpersonationSession } from '@\/lib';
import { toastError } from '@\/lib';

interface ImpersonateResponse {
  sessionToken: string;
  logId: string;
}

export function useImpersonate() {
  return useMutation({
    mutationFn: ({ id }: { id: string; label: string }) =>
      apiClient.post<ImpersonateResponse>(`/users/${id}/impersonate`),
    onSuccess: (data, variables) => {
      startImpersonationSession(data.sessionToken, data.logId, variables.label);
      // Full reload, not a client-side router push — every TanStack Query cache entry keyed by
      // the old session's data must be dropped, not silently reused across the identity switch.
      window.location.href = '/dashboard';
    },
    onError: (error) => toastError("Couldn't login as user", error),
  });
}

// Not named useEndImpersonation()/prefixed "use" on purpose — it's a plain async function called
// from an onClick handler (must run endImpersonationSession() synchronously before the API call),
// and eslint-plugin-react-hooks enforces rules-of-hooks on any "use*"-named identifier.
export async function endImpersonation(): Promise<void> {
  const result = endImpersonationSession();
  if (!result) return;
  try {
    await apiClient.post(`/users/impersonate/${result.logId}/end`);
    window.location.href = '/dashboard';
  } catch (error) {
    // The client-side identity swap back to the sysadmin's own token already happened above —
    // don't block the user from returning to their session just because the audit-log write
    // failed. Delay the reload briefly so the toast is actually visible before navigation wipes it.
    toastError("Couldn't record the end of this impersonation", error);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  }
}
