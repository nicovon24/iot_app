import { apiClient } from './api-client';
import { setSessionToken } from './session';

export async function login(username: string, password: string): Promise<void> {
  const result = await apiClient.post<{ sessionToken: string }>('/auth/login', {
    username,
    password,
  });
  setSessionToken(result.sessionToken);
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setSessionToken(null);
  }
}
