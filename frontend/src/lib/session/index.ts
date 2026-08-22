import type { ImpersonationMeta } from '@/types';

export type { ImpersonationMeta } from '@/types';

const STORAGE_KEY = 'iot_session_token';
const ORIGINAL_TOKEN_STORAGE_KEY = 'iot_original_session_token';
const IMPERSONATION_META_STORAGE_KEY = 'iot_impersonation_meta';

let sessionToken: string | null = null;

/**
 * Reads the token, rehydrating from sessionStorage if the in-memory copy is empty.
 *
 * The lazy read is the point. This used to return the module-level variable directly, which
 * made every request depend on initSessionFromStorage() having run first — and that happens
 * in exactly one place, AuthGate's mount effect. Anything that re-evaluated this module after
 * that effect (a dev-server hot reload of any sibling under lib/, since the lib barrel
 * re-exports both ./session and ./ui) reset the variable to null while AuthGate kept its own
 * React state saying "authenticated". The result was a fully rendered shell in which every
 * single API call went out with no x-session-token header and came back 401.
 *
 * sessionStorage is the real source of truth; the variable is only a cache. Reading through
 * to it means the token survives module re-evaluation and no longer depends on call ordering.
 */
export function getSessionToken(): string | null {
  if (sessionToken === null && typeof window !== 'undefined') {
    sessionToken = window.sessionStorage.getItem(STORAGE_KEY);
  }
  return sessionToken;
}

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  if (typeof window === 'undefined') return;
  if (token) {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Eagerly warms the cache at app start. getSessionToken() no longer depends on this having
 * run, so it is now a convenience rather than a prerequisite — AuthGate still calls it so the
 * authenticated check on mount is a plain synchronous read.
 */
export function initSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  sessionToken = window.sessionStorage.getItem(STORAGE_KEY);
}

export function startImpersonationSession(newToken: string, logId: string, label: string): void {
  if (typeof window === 'undefined') return;
  // Do not overwrite an already-saved original with another impersonated token — that would
  // make "Back to my session" restore the wrong thing.
  if (!window.sessionStorage.getItem(ORIGINAL_TOKEN_STORAGE_KEY)) {
    const current = getSessionToken();
    if (current) {
      window.sessionStorage.setItem(ORIGINAL_TOKEN_STORAGE_KEY, current);
    }
  }
  setSessionToken(newToken);
  window.sessionStorage.setItem(IMPERSONATION_META_STORAGE_KEY, JSON.stringify({ logId, label }));
}

export function getImpersonationMeta(): ImpersonationMeta | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(IMPERSONATION_META_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ImpersonationMeta) : null;
}

export function endImpersonationSession(): { originalToken: string; logId: string } | null {
  if (typeof window === 'undefined') return null;
  const originalToken = window.sessionStorage.getItem(ORIGINAL_TOKEN_STORAGE_KEY);
  const meta = getImpersonationMeta();
  if (!originalToken || !meta) return null;

  setSessionToken(originalToken);
  window.sessionStorage.removeItem(ORIGINAL_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(IMPERSONATION_META_STORAGE_KEY);

  return { originalToken, logId: meta.logId };
}
