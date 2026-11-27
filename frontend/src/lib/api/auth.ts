import { apiClient } from './api-client';
import { setSessionToken } from '../session';
import { isDemoSession, stopDemoSession } from '@/lib/demo';

export async function login(
  username: string,
  password: string,
  thingsboardUrl: string,
): Promise<void> {
  stopDemoSession();
  const result = await apiClient.post<{ sessionToken: string }>('/auth/login', {
    username,
    password,
    thingsboardUrl,
  });
  setSessionToken(result.sessionToken);
}

export async function logout(): Promise<void> {
  if (isDemoSession()) {
    stopDemoSession();
    return;
  }
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setSessionToken(null);
  }
}
