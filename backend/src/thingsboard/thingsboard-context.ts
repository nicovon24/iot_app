import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppSession } from '../auth/auth.service';

export const thingsboardContext = new AsyncLocalStorage<AppSession>();
const requestContext = new AsyncLocalStorage<{ session?: AppSession }>();

export function runWithThingsboardRequestContext<T>(callback: () => T): T {
  return requestContext.run({}, callback);
}

export function setRequestThingsboardSession(session: AppSession): void {
  const store = requestContext.getStore();
  if (!store) throw new Error('ThingsBoard request context not initialized');
  store.session = session;
}

export function currentThingsboardSession(): AppSession | undefined {
  return thingsboardContext.getStore() ?? requestContext.getStore()?.session;
}

export function scopedCacheKey(key: string): string {
  const session = currentThingsboardSession();
  if (!session?.thingsboardUrl || !session.tbUserId) {
    throw new Error('ThingsBoard session required for cache access');
  }
  return `tb:${encodeURIComponent(session.thingsboardUrl)}:${session.tbUserId}:${key}`;
}
