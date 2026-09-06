import { AppSession } from '../../auth/auth.service';
import { EntitiesService } from '../../entities/entities.service';
import { isEntityInScope } from './ws-auth.util';

/**
 * isEntityInScope is now a thin delegation to EntitiesService.isInScope — there is
 * one implementation of the customer-hierarchy rule, and it is covered directly in
 * entities.service.spec.ts (own customer, descendant, sibling, unassigned entity,
 * missing session). What matters here is that REST and WS reach that one rule with
 * the arguments they were given, so the two transports cannot drift apart.
 *
 * The former isDescendantCustomer tests are gone with the function: it walked the
 * hierarchy upward with one uncached ThingsBoard request per level, duplicating the
 * downward resolution used elsewhere. Its cycle and depth-limit cases no longer have
 * anything to guard — the surviving fixed-point expansion cannot loop.
 */
const CUSTOMER_SESSION: AppSession = {
  tbUserId: 'u1',
  email: 'a@b.com',
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'ADMIN',
  tbToken: 'tb-token',
};

describe('isEntityInScope', () => {
  let entitiesService: { isInScope: jest.Mock };

  beforeEach(() => {
    entitiesService = { isInScope: jest.fn() };
  });

  it('delegates to EntitiesService.isInScope with the caller’s arguments', async () => {
    entitiesService.isInScope.mockResolvedValue(true);

    const inScope = await isEntityInScope(
      CUSTOMER_SESSION,
      'd1',
      'DEVICE',
      entitiesService as unknown as EntitiesService,
    );

    expect(inScope).toBe(true);
    expect(entitiesService.isInScope).toHaveBeenCalledWith(CUSTOMER_SESSION, 'd1', 'DEVICE');
  });

  it('propagates a denial rather than softening it', async () => {
    entitiesService.isInScope.mockResolvedValue(false);

    await expect(
      isEntityInScope(
        CUSTOMER_SESSION,
        'd1',
        'ASSET',
        entitiesService as unknown as EntitiesService,
      ),
    ).resolves.toBe(false);
  });
});
