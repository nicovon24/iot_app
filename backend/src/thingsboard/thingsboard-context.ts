import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppSession } from '../auth/auth.service';

export const thingsboardContext = new AsyncLocalStorage<AppSession>();

export function currentThingsboardSession(): AppSession | undefined {
  return thingsboardContext.getStore();
}

export function scopedCacheKey(key: string): string {
  const session = currentThingsboardSession();
  if (!session?.thingsboardUrl || !session.tbUserId) {
    throw new Error('ThingsBoard session required for cache access');
  }
  return `tb:${encodeURIComponent(session.thingsboardUrl)}:${session.tbUserId}:${key}`;
}
