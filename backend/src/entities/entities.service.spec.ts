import 'reflect-metadata';
import { AppSession } from '../auth/auth.service';
import { RedisService } from '../thingsboard/redis.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { EntitiesService } from './entities.service';
import { TB_NULL_CUSTOMER_ID } from './entity-ref-resolver';

/**
 * Covers EntitiesService.isInScope — the single rule CustomerScopeGuard,
 * TelemetryGateway and AssetsService.linkDevice all converge on. The guard specs
 * mock this method out, so without these tests the actual scoping decision is
 * untested.
 */
const CUSTOMER_SESSION: AppSession = {
  tbUserId: 'u1',
  email: 'user@example.com',
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'ADMIN',
  tbToken: 'tok',
};

// c1 -> c2 -> c3 is the caller's own subtree; sibling has no relation to it.
const CUSTOMERS = [
  { id: { id: 'c1' }, title: 'Root' },
  { id: { id: 'c2' }, title: 'Child', parentCustomerId: { id: 'c1' } },
  { id: { id: 'c3' }, title: 'Grandchild', parentCustomerId: { id: 'c2' } },
  { id: { id: 'sibling' }, title: 'Unrelated' },
];

describe('EntitiesService.isInScope', () => {
  let tb: { request: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock; delByPattern: jest.Mock };
  let service: EntitiesService;

  /** Routes the two TB calls isInScope makes: the entity lookup, then the customer list. */
  function mockTb(owningCustomerId: string | undefined) {
    tb.request.mockImplementation((_method: string, path: string) => {
      if (path.startsWith('/api/customers')) {
        return Promise.resolve({
          data: CUSTOMERS,
          totalPages: 1,
          totalElements: 4,
          hasNext: false,
        });
      }
      return Promise.resolve({
        id: { id: 'e1' },
        customerId: owningCustomerId ? { id: owningCustomerId } : undefined,
      });
    });
  }

  beforeEach(() => {
    tb = { request: jest.fn() };
    // Cache always misses, so every test exercises the real resolution path.
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn(),
    };
    service = new EntitiesService(
      tb as unknown as ThingsboardClientService,
      redis as unknown as RedisService,
    );
  });

  it.each(['TENANT_ADMIN', 'SYS_ADMIN'] as const)('lets a %s reach anything', async (authority) => {
    const session = { ...CUSTOMER_SESSION, authority };
    await expect(service.isInScope(session, 'e1', 'DEVICE')).resolves.toBe(true);
    expect(tb.request).not.toHaveBeenCalled();
  });

  it('lets a customer user reach an entity owned by its own customer', async () => {
    mockTb('c1');
    await expect(service.isInScope(CUSTOMER_SESSION, 'e1', 'DEVICE')).resolves.toBe(true);
  });

  it('lets a customer user reach an entity owned by a descendant sub-customer', async () => {
    mockTb('c3');
    await expect(service.isInScope(CUSTOMER_SESSION, 'e1', 'DEVICE')).resolves.toBe(true);
  });

  it('blocks an entity owned by an unrelated sibling customer', async () => {
    mockTb('sibling');
    await expect(service.isInScope(CUSTOMER_SESSION, 'e1', 'DEVICE')).resolves.toBe(false);
  });

  it('blocks an entity ThingsBoard never assigned to a real customer', async () => {
    // TB reports its placeholder id rather than a null customerId, so a naive
    // truthiness check would treat an unowned device as owned.
    mockTb(TB_NULL_CUSTOMER_ID);
    await expect(service.isInScope(CUSTOMER_SESSION, 'e1', 'DEVICE')).resolves.toBe(false);
  });

  it('blocks a session with no customer scope', async () => {
    mockTb('c1');
    const session = { ...CUSTOMER_SESSION, customerId: null };
    await expect(service.isInScope(session, 'e1', 'DEVICE')).resolves.toBe(false);
  });

  it('fails closed when no session is supplied', async () => {
    // A caller that forgets to pass the session must get nothing, not everything.
    // @Public() routes have to skip this call rather than rely on a default here.
    mockTb('c1');
    await expect(service.isInScope(null, 'e1', 'DEVICE')).resolves.toBe(false);
  });
});
