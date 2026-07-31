import { CanActivate, ExecutionContext, ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AppSession } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { ThingsboardClientService } from '../../thingsboard/thingsboard-client.service';
import { EntityType, TbCustomer } from '../../types';

/**
 * Enforces ThingsBoard customer-hierarchy scoping (Phase 2.2): TENANT_ADMIN bypasses
 * entirely; a CUSTOMER_USER may only reach entities owned by its own customer or a
 * descendant sub-customer. Descendants are resolved via ThingsBoard's native
 * `parentCustomerId` field on the Customer entity (a Professional Edition feature,
 * confirmed against a real TB Cloud instance on 2026-07-31) — walked upward from the
 * target customer to the caller's own customer, not via generic relations. Generic
 * "Contains" relations remain in use elsewhere (asset/device containment), but are not
 * how customer hierarchy is modeled.
 */
@Injectable()
export class CustomerScopeGuard implements CanActivate {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly tb: ThingsboardClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { session?: AppSession }>();
    const session = request.session;
    if (!session) {
      // No session means SessionAuthGuard already let this through as a @Public() route
      // (e.g. POST /auth/login) — nothing to scope here, defer entirely to that guard.
      return true;
    }

    if (session.authority === 'TENANT_ADMIN' || session.authority === 'SYS_ADMIN') {
      return true;
    }

    const params = request.params as { id?: string };
    const query = request.query as { type?: EntityType };
    if (!params.id || !query.type) {
      // Not an entity-scoped route (e.g. list endpoints) — scoping happens per-entity only.
      return true;
    }

    const targetCustomerId = await this.entitiesService.getOwningCustomerId(params.id, query.type);
    if (!targetCustomerId || !session.customerId) {
      throw new ForbiddenException('Entity has no resolvable customer scope');
    }

    if (targetCustomerId === session.customerId) {
      return true;
    }

    const isDescendant = await this.isDescendantCustomer(session.customerId, targetCustomerId);
    if (!isDescendant) {
      throw new ForbiddenException('Entity is outside your customer hierarchy');
    }
    return true;
  }

  private async isDescendantCustomer(ancestorCustomerId: string, targetCustomerId: string): Promise<boolean> {
    const visited = new Set<string>();
    const MAX_DEPTH = 50;

    for (let depth = 0, currentId = targetCustomerId; depth < MAX_DEPTH; depth++) {
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      let customer: TbCustomer;
      try {
        customer = await this.tb.request<TbCustomer>('GET', `/api/customer/${currentId}`);
      } catch (err) {
        // A broken/unassigned chain (e.g. TB's NULL_UUID placeholder customerId on an
        // entity with no real customer) means the entity is not reachable through any
        // real customer hierarchy — not a descendant, not a server error.
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
}
