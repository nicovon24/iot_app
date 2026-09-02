import { ExecutionContext, ForbiddenException, HttpException } from '@nestjs/common';
import { AppSession } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { ThingsboardClientService } from '../../thingsboard/thingsboard-client.service';
import { CustomerScopeGuard } from './customer-scope.guard';

function makeContext(
  session: AppSession | undefined,
  params: { id?: string } = {},
  query: { type?: string } = {},
): ExecutionContext {
  const request = { session, params, query };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const CUSTOMER_SESSION: AppSession = {
  tbUserId: 'u1',
  email: 'a@b.com',
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'ADMIN',
  tbToken: 'tb-token',
  tbRefreshToken: 'tb-refresh',
};

describe('CustomerScopeGuard', () => {
  let entitiesService: { getOwningCustomerId: jest.Mock };
  let tb: Record<string, jest.Mock>;
  let guard: CustomerScopeGuard;

  beforeEach(() => {
    entitiesService = { getOwningCustomerId: jest.fn() };
    tb = { request: jest.fn() };
    guard = new CustomerScopeGuard(
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
    expect(entitiesService.getOwningCustomerId).not.toHaveBeenCalled();
  });

  it('passes through a non-entity-scoped route (missing id or type)', async () => {
    await expect(guard.canActivate(makeContext(CUSTOMER_SESSION, {}, {}))).resolves.toBe(true);
    expect(entitiesService.getOwningCustomerId).not.toHaveBeenCalled();
  });

  it('allows access to an entity owned by the caller’s own customer', async () => {
    entitiesService.getOwningCustomerId.mockResolvedValue('c1');
    const context = makeContext(CUSTOMER_SESSION, { id: 'd1' }, { type: 'DEVICE' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects access to an entity outside the customer hierarchy', async () => {
    entitiesService.getOwningCustomerId.mockResolvedValue('other-customer');
    tb.request.mockRejectedValue(new HttpException('not found', 404));
    const context = makeContext(CUSTOMER_SESSION, { id: 'd1' }, { type: 'DEVICE' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
