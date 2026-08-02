const STORAGE_KEY = 'iot_session_token';

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
