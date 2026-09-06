import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppSession } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { ThingsboardClientService } from '../../thingsboard/thingsboard-client.service';
import { ScopedEntity } from '../decorators/scoped-entity.decorator';
import { CustomerScopeGuard } from './customer-scope.guard';

/** Stand-in controller: `scoped` carries route metadata the way a real
 *  @ScopedEntity() handler does, `unscoped` carries none — mirroring
 *  POST /devices/:id/claim, which must stay unscoped. */
class ProbeController {
  @ScopedEntity('DEVICE')
  scoped(): void {}
  unscoped(): void {}
}

function makeContext(
  session: AppSession | undefined,
  params: { id?: string } = {},
  query: { type?: string } = {},
  handler: () => void = ProbeController.prototype.unscoped,
): ExecutionContext {
  const request = { session, params, query };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => ProbeController,
  } as unknown as ExecutionContext;
}

const CUSTOMER_SESSION: AppSession = {
  tbUserId: 'u1',
  email: 'a@b.com',
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'ADMIN',
  tbToken: 'tb-token',
};

describe('CustomerScopeGuard', () => {
  // The guard delegates the hierarchy decision to EntitiesService.isInScope, which
  // is covered on its own in entities.service.spec.ts. These tests are about which
  // requests reach that decision at all.
  let entitiesService: { isInScope: jest.Mock };
  let tb: Record<string, jest.Mock>;
  let guard: CustomerScopeGuard;

  beforeEach(() => {
    entitiesService = { isInScope: jest.fn() };
    tb = { request: jest.fn() };
    guard = new CustomerScopeGuard(
      new Reflector(),
      entitiesService as unknown as EntitiesService,
      tb as unknown as ThingsboardClientService,
    );
  });

  it('passes through when there is no session (public route)', async () => {
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
  });

  it.each(['TENANT_ADMIN', 'SYS_ADMIN'] as const)('bypasses scoping for %s', async (authority) => {
    const session = { ...CUSTOMER_SESSION, authority };
    await expect(guard.canActivate(makeContext(session))).resolves.toBe(true);
    expect(entitiesService.isInScope).not.toHaveBeenCalled();
  });

  it('passes through a non-entity-scoped route (missing id or type)', async () => {
    await expect(guard.canActivate(makeContext(CUSTOMER_SESSION, {}, {}))).resolves.toBe(true);
    expect(entitiesService.isInScope).not.toHaveBeenCalled();
  });

  it('allows access to an entity owned by the caller’s own customer', async () => {
    entitiesService.isInScope.mockResolvedValue(true);
    const context = makeContext(CUSTOMER_SESSION, { id: 'd1' }, { type: 'DEVICE' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects access to an entity outside the customer hierarchy', async () => {
    entitiesService.isInScope.mockResolvedValue(false);
    const context = makeContext(CUSTOMER_SESSION, { id: 'd1' }, { type: 'DEVICE' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  // The controllers for assets/devices/customers have a fixed entity type and
  // never send ?type=, so before @ScopedEntity() their `:id` routes fell through
  // this guard entirely and were reachable across customer boundaries.
  it('scopes a route from @ScopedEntity() metadata when there is no ?type=', async () => {
    entitiesService.isInScope.mockResolvedValue(false);
    const context = makeContext(
      CUSTOMER_SESSION,
      { id: 'd1' },
      {},
      ProbeController.prototype.scoped,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(entitiesService.isInScope).toHaveBeenCalledWith(CUSTOMER_SESSION, 'd1', 'DEVICE');
  });

  // Regression guard for POST /devices/:id/claim: its target Device has no owning
  // Customer by definition, so scoping it would 403 every claim. It must carry no
  // @ScopedEntity() metadata and must pass straight through.
  it('passes through an :id route that declares no scoped entity', async () => {
    const context = makeContext(
      CUSTOMER_SESSION,
      { id: 'd1' },
      {},
      ProbeController.prototype.unscoped,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitiesService.isInScope).not.toHaveBeenCalled();
  });
});
