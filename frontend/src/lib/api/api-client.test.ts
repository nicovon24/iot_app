import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError } from './api-client';
import { getSessionToken, setSessionToken } from '../session';

const storage = new Map<string, string>();
const sessionStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};
const location = { pathname: '/dashboard', href: '/dashboard' };

describe('API session handling', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage, location });
    storage.clear();
    location.pathname = '/dashboard';
    location.href = '/dashboard';
    setSessionToken('current-session');
  });

  afterEach(() => {
    setSessionToken(null);
    vi.unstubAllGlobals();
  });

  it('keeps the app session when ThingsBoard returns 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: 'ThingsBoard session expired' }, { status: 401 }),
        ),
    );
    await expect(apiClient.get('/devices')).rejects.toBeInstanceOf(ApiError);
    expect(getSessionToken()).toBe('current-session');
    expect(location.href).toBe('/dashboard');
  });

  it('ends the session when the app guard rejects the current token', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: 'APP_SESSION_INVALID', message: 'Missing or invalid session token' },
            { status: 401 },
          ),
        ),
    );
    await expect(apiClient.get('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(getSessionToken()).toBeNull();
    expect(location.href).toBe('/login');
  });

  it('does not clear a new login after an older request fails', async () => {
    let finishRequest!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          finishRequest = resolve;
        }),
      ),
    );
    const pending = apiClient.get('/dashboards');
    setSessionToken('new-session');
    finishRequest(Response.json({ code: 'APP_SESSION_INVALID' }, { status: 401 }));
    await expect(pending).rejects.toBeInstanceOf(ApiError);
    expect(getSessionToken()).toBe('new-session');
    expect(location.href).toBe('/dashboard');
  });
});
