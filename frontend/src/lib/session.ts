const STORAGE_KEY = 'iot_session_token';
const ORIGINAL_TOKEN_STORAGE_KEY = 'iot_original_session_token';
const IMPERSONATION_META_STORAGE_KEY = 'iot_impersonation_meta';

let sessionToken: string | null = null;

export function getSessionToken(): string | null {
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

export function initSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  sessionToken = window.sessionStorage.getItem(STORAGE_KEY);
}

export interface ImpersonationMeta {
  logId: string;
  label: string;
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
