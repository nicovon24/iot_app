import type { AppSession } from '../auth/auth.service';
import { ConfigService } from '../config/config.service';
import { currentThingsboardSession } from './thingsboard-context';

/** The Prisma startup backfill assigns legacy rows to the configured original instance. */
export function instanceWhere(session: AppSession, config: ConfigService) {
  const origin = session.thingsboardUrl ?? new URL(config.thingsboardUrl).origin;
  return { instanceUrl: origin };
}

export function currentInstance(config: ConfigService): string {
  return currentThingsboardSession()?.thingsboardUrl ?? new URL(config.thingsboardUrl).origin;
}

export function currentInstanceWhere(config: ConfigService) {
  return instanceWhere({ thingsboardUrl: currentInstance(config) } as AppSession, config);
}
