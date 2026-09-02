import { HttpException } from '@nestjs/common';
import { AppSession } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { ThingsboardClientService } from '../../thingsboard/thingsboard-client.service';
import { TbCustomer } from '../../types';
import { isDescendantCustomer, isEntityInScope } from './ws-auth.util';

const CUSTOMER_SESSION: AppSession = {
  tbUserId: 'u1',
  email: 'a@b.com',
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'ADMIN',
  tbToken: 'tb-token',
  tbRefreshToken: 'tb-refresh',
};

function customerWithParent(id: string, parentId?: string): TbCustomer {
  return {
    id: { id, entityType: 'CUSTOMER' },
    title: id,
    parentCustomerId: parentId ? { id: parentId, entityType: 'CUSTOMER' } : undefined,
  };
}

describe('isEntityInScope', () => {
  let entitiesService: { getOwningCustomerId: jest.Mock };
  let tb: { request: jest.Mock };

  beforeEach(() => {
    entitiesService = { getOwningCustomerId: jest.fn() };
    tb = { request: jest.fn() };
  });

  it.each(['TENANT_ADMIN', 'SYS_ADMIN'] as const)('bypasses scoping for %s', async (authority) => {
    const session = { ...CUSTOMER_SESSION, authority };
    const inScope = await isEntityInScope(
      session,
      'd1',
      'DEVICE',
      entitiesService as unknown as EntitiesService,
      tb as unknown as ThingsboardClientService,
    );
    expect(inScope).toBe(true);
    expect(entitiesService.getOwningCustomerId).not.toHaveBeenCalled();
  });

  it('returns false when the entity has no owning customer', async () => {
    entitiesService.getOwningCustomerId.mockResolvedValue(null);
    const inScope = await isEntityInScope(
      CUSTOMER_SESSION,
      'd1',
      'DEVICE',
      entitiesService as unknown as EntitiesService,
      tb as unknown as ThingsboardClientService,
    );
    expect(inScope).toBe(false);
  });

  it('returns true when the entity belongs to the caller’s own customer', async () => {
    entitiesService.getOwningCustomerId.mockResolvedValue('c1');
    const inScope = await isEntityInScope(
      CUSTOMER_SESSION,
      'd1',
      'DEVICE',
      entitiesService as unknown as EntitiesService,
      tb as unknown as ThingsboardClientService,
    );
    expect(inScope).toBe(true);
  });

  it('returns true when the entity belongs to a descendant customer', async () => {
    entitiesService.getOwningCustomerId.mockResolvedValue('child');
    tb.request.mockResolvedValue(customerWithParent('child', 'c1'));
    const inScope = await isEntityInScope(
      CUSTOMER_SESSION,
      'd1',
      'DEVICE',
      entitiesService as unknown as EntitiesService,
      tb as unknown as ThingsboardClientService,
    );
    expect(inScope).toBe(true);
  });

  it('returns false when the entity belongs to an unrelated customer', async () => {
    entitiesService.getOwningCustomerId.mockResolvedValue('unrelated');
    tb.request.mockResolvedValue(customerWithParent('unrelated', undefined));
    const inScope = await isEntityInScope(
      CUSTOMER_SESSION,
      'd1',
      'DEVICE',
      entitiesService as unknown as EntitiesService,
      tb as unknown as ThingsboardClientService,
    );
    expect(inScope).toBe(false);
  });
});

describe('isDescendantCustomer', () => {
  let tb: { request: jest.Mock };

  beforeEach(() => {
    tb = { request: jest.fn() };
  });

  it('returns true for a direct child', async () => {
    tb.request.mockResolvedValue(customerWithParent('child', 'ancestor'));

    const result = await isDescendantCustomer(
      'ancestor',
      'child',
      tb as unknown as ThingsboardClientService,
    );
    expect(result).toBe(true);
  });

  it('walks multiple levels up to find the ancestor', async () => {
    tb.request
      .mockResolvedValueOnce(customerWithParent('grandchild', 'child'))
      .mockResolvedValueOnce(customerWithParent('child', 'ancestor'));

    const result = await isDescendantCustomer(
      'ancestor',
      'grandchild',
      tb as unknown as ThingsboardClientService,
    );
    expect(result).toBe(true);
  });

  it('returns false when the walk reaches a root customer with no ancestor match', async () => {
    tb.request.mockResolvedValue(customerWithParent('orphan', undefined));

    const result = await isDescendantCustomer(
      'ancestor',
      'orphan',
      tb as unknown as ThingsboardClientService,
    );
    expect(result).toBe(false);
  });

  it('treats a 404 while walking as "not a descendant", not a server error', async () => {
    // Regression: TB's NULL_UUID placeholder customerId 404s when looked up — this must
    // resolve to false, not bubble up as an unhandled error (STATE.md, Phase 2.2 finding).
    tb.request.mockRejectedValue(new HttpException('not found', 404));

    const result = await isDescendantCustomer(
      'ancestor',
      'never-assigned',
      tb as unknown as ThingsboardClientService,
    );
    expect(result).toBe(false);
  });

  it('rethrows a non-404 error instead of swallowing it', async () => {
    tb.request.mockRejectedValue(new HttpException('server error', 500));

    await expect(
      isDescendantCustomer('ancestor', 'target', tb as unknown as ThingsboardClientService),
    ).rejects.toThrow(HttpException);
  });

  it('stops and returns false on a cycle instead of looping forever', async () => {
    // a -> b -> a -> ... : the `visited` set must break this, not hit MAX_DEPTH by luck.
    tb.request.mockImplementation((_method: string, path: string) => {
      if (path.endsWith('/a')) return Promise.resolve(customerWithParent('a', 'b'));
      return Promise.resolve(customerWithParent('b', 'a'));
    });

    const result = await isDescendantCustomer(
      'never-in-the-cycle',
      'a',
      tb as unknown as ThingsboardClientService,
    );
    expect(result).toBe(false);
  });
});
