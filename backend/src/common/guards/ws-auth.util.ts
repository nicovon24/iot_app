import { HttpException } from '@nestjs/common';
import { AppSession } from '../../auth/auth.service';
import { AuthService } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { ThingsboardClientService } from '../../thingsboard/thingsboard-client.service';
import { EntityType, TbCustomer } from '../../types';

/**
 * Resolves an AppSession from a raw session token, for use at WS connection time.
 * Reuses AuthService.getSession() — the same Redis-backed lookup SessionAuthGuard uses
 * for REST — so WS and REST auth never drift into two different implementations.
 */
export async function resolveWsSession(sessionToken: string, authService: AuthService): Promise<AppSession | null> {
  return authService.getSession(sessionToken);
}

/**
 * The single customer-hierarchy scoping decision, shared by CustomerScopeGuard (REST)
 * and TelemetryGateway (WS): TENANT_ADMIN/SYS_ADMIN see everything; a CUSTOMER_USER may
 * only reach an entity owned by its own customer or a descendant sub-customer, walked via
 * ThingsBoard's native `parentCustomerId` field (see CustomerScopeGuard's original
 * doc comment for why this is PE-native and not a generic "Contains" relation).
 */
export async function isEntityInScope(
  session: AppSession,
  entityId: string,
  entityType: EntityType,
  entitiesService: EntitiesService,
  tb: ThingsboardClientService,
): Promise<boolean> {
  if (session.authority === 'TENANT_ADMIN' || session.authority === 'SYS_ADMIN') {
    return true;
  }

  const targetCustomerId = await entitiesService.getOwningCustomerId(entityId, entityType);
  if (!targetCustomerId || !session.customerId) {
    return false;
  }

  if (targetCustomerId === session.customerId) {
    return true;
  }

  return isDescendantCustomer(session.customerId, targetCustomerId, tb);
}

export async function isDescendantCustomer(
  ancestorCustomerId: string,
  targetCustomerId: string,
  tb: ThingsboardClientService,
): Promise<boolean> {
  const visited = new Set<string>();
  const MAX_DEPTH = 50;

  for (let depth = 0, currentId = targetCustomerId; depth < MAX_DEPTH; depth++) {
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    let customer: TbCustomer;
    try {
      customer = await tb.request<TbCustomer>('GET', `/api/customer/${currentId}`);
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === 404) return false;
      throw err;
    }
    const parentId: string | undefined = customer.parentCustomerId?.id;
    if (!parentId) return false;
    if (parentId === ancestorCustomerId) return true;
    currentId = parentId;
  }

  return false;
}
