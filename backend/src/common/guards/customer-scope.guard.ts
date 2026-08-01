import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AppSession } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { ThingsboardClientService } from '../../thingsboard/thingsboard-client.service';
import { EntityType } from '../../types';
import { isEntityInScope } from './ws-auth.util';

/**
 * Enforces ThingsBoard customer-hierarchy scoping (Phase 2.2): TENANT_ADMIN bypasses
 * entirely; a CUSTOMER_USER may only reach entities owned by its own customer or a
 * descendant sub-customer. The actual scoping decision lives in `isEntityInScope`
 * (ws-auth.util.ts), shared with TelemetryGateway (Phase 3) so REST and WS never enforce
 * two different rules. Descendants are resolved via ThingsBoard's native
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

    const inScope = await isEntityInScope(session, params.id, query.type, this.entitiesService, this.tb);
    if (!inScope) {
      throw new ForbiddenException('Entity is outside your customer hierarchy');
    }
    return true;
  }
}
