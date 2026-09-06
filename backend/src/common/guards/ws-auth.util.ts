import { AppSession } from '../../auth/auth.service';
import { AuthService } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { EntityType } from '../../types';

/**
 * Resolves an AppSession from a raw session token, for use at WS connection time.
 * Reuses AuthService.getSession() — the same Redis-backed lookup SessionAuthGuard uses
 * for REST — so WS and REST auth never drift into two different implementations.
 */
export async function resolveWsSession(
  sessionToken: string,
  authService: AuthService,
): Promise<AppSession | null> {
  return authService.getSession(sessionToken);
}

/**
 * The single customer-hierarchy scoping decision, shared by CustomerScopeGuard (REST)
 * and TelemetryGateway (WS).
 *
 * Delegates to EntitiesService.isInScope so exactly one implementation of the rule
 * exists. This function previously walked the hierarchy *upward* from the target with
 * one uncached ThingsBoard request per level (capped at 50, with its own cycle
 * detection), while AssetsService.linkDevice resolved the descendant set *downward*
 * via resolveScopedCustomerIds. Two implementations of one authorization rule could
 * disagree — notably around pagination limits — and a rule that behaves differently
 * depending on which route you arrived through is very hard to reason about.
 *
 * The surviving implementation is also the cached one, so the per-level request chain
 * is gone. Cycle safety now falls out of the fixed-point set expansion rather than
 * needing an explicit visited set and depth cap.
 */
export async function isEntityInScope(
  session: AppSession,
  entityId: string,
  entityType: EntityType,
  entitiesService: EntitiesService,
): Promise<boolean> {
  return entitiesService.isInScope(session, entityId, entityType);
}
