import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppSession } from '../auth/auth.service';

export const thingsboardContext = new AsyncLocalStorage<AppSession>();

export function currentThingsboardSession(): AppSession | undefined {
  return thingsboardContext.getStore();
}
