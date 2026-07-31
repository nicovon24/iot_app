import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AppSession } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { ThingsboardClientService } from '../../thingsboard/thingsboard-client.service';
import { EntityType, TbRelation } from '../../types';

const CUSTOMER_HIERARCHY_RELATION_TYPE = 'Contains';

/**
 * Enforces ThingsBoard customer-hierarchy scoping (Phase 2.2): TENANT_ADMIN bypasses
 * entirely; a CUSTOMER_USER may only reach entities owned by its own customer or a
 * descendant sub-customer. Descendants are resolved via TB's relations API — ThingsBoard
 * CE has no native "customer hierarchy" concept, so sub-customer structure here is
 * expressed as Customer->Customer relations of type "Contains" (confirm this matches
 * how the real TB instance models hierarchy before relying on it in production).
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
    const queue = [ancestorCustomerId];

    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (visited.has(current)) continue;
      visited.add(current);

      const relations = await this.tb.request<TbRelation[]>(
        'GET',
        `/api/relations?fromId=${current}&fromType=CUSTOMER&relationType=${CUSTOMER_HIERARCHY_RELATION_TYPE}`,
      );

      for (const relation of relations) {
        if (relation.to.entityType !== 'CUSTOMER') continue;
        if (relation.to.id === targetCustomerId) return true;
        queue.push(relation.to.id);
      }
    }

    return false;
  }
}
