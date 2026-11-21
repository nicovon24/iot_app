import { AppSession } from '../auth/auth.service';
import { ConfigService } from '../config/config.service';
import { EntitiesService } from '../entities/entities.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { RedisService } from '../thingsboard/redis.service';
import { DashboardAiService } from './dashboard-ai.service';
import { DashboardsService } from './dashboards.service';

const session: AppSession = {
  tbUserId: 'user-a',
  email: 'a@example.com',
  authority: 'TENANT_ADMIN',
  customerId: null,
  appRole: 'ADMIN',
  tbToken: 'token',
  thingsboardUrl: 'https://tb-one.example',
};

describe('DashboardAiService isolation', () => {
  const config = { thingsboardUrl: 'https://tb-one.example' };
  const prisma = {
    aiProviderConnection: { findMany: jest.fn() },
    aiUserLimits: { findUnique: jest.fn() },
    aiConversation: { findFirst: jest.fn() },
  };
  const service = new DashboardAiService(
    config as ConfigService,
    prisma as unknown as PrismaService,
    {} as EntitiesService,
    {} as TelemetryService,
    {} as RedisService,
    {} as DashboardsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.aiProviderConnection.findMany.mockResolvedValue([]);
    prisma.aiUserLimits.findUnique.mockResolvedValue(null);
    prisma.aiConversation.findFirst.mockResolvedValue(null);
  });

  it('scopes connection and limit reads to the user and ThingsBoard instance', async () => {
    await service.getSettings(session);
    expect(prisma.aiProviderConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tbUserId: 'user-a', instanceUrl: 'https://tb-one.example' },
        select: { id: true, provider: true, model: true, endpointUrl: true },
      }),
    );
    expect(prisma.aiUserLimits.findUnique).toHaveBeenCalledWith({
      where: {
        tbUserId_instanceUrl: { tbUserId: 'user-a', instanceUrl: 'https://tb-one.example' },
      },
    });
  });

  it('rejects a conversation outside the current user and instance', async () => {
    await expect(service.getConversation('other', session)).rejects.toMatchObject({ status: 404 });
    expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'other', tbUserId: 'user-a', instanceUrl: 'https://tb-one.example' },
      }),
    );
  });

  it('denies readers before accessing providers or conversations', async () => {
    await expect(
      service.generate({ prompt: 'Create a dashboard' }, { ...session, appRole: 'READER' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.aiConversation.findFirst).not.toHaveBeenCalled();
  });
});

describe('DashboardAiService generation', () => {
  const config = {
    thingsboardUrl: 'https://tb-one.example',
    aiCredentialEncryptionKey: '0'.repeat(64),
  };
  const prisma = {
    aiConversation: { findFirst: jest.fn(), create: jest.fn() },
    aiProviderConnection: { findFirst: jest.fn() },
    aiUserLimits: { findUnique: jest.fn() },
  };
  const entities = { list: jest.fn() };
  const telemetry = { getKeys: jest.fn() };
  const redis = { acquire: jest.fn(), consumeDaily: jest.fn(), release: jest.fn() };
  const dashboards = { getById: jest.fn(), save: jest.fn(), create: jest.fn() };
  const service = new DashboardAiService(
    config as ConfigService,
    prisma as unknown as PrismaService,
    entities as unknown as EntitiesService,
    telemetry as unknown as TelemetryService,
    redis as unknown as RedisService,
    dashboards as unknown as DashboardsService,
  );
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.aiConversation.findFirst.mockResolvedValue(null);
    prisma.aiConversation.create.mockResolvedValue({ id: 'conversation-1' });
    prisma.aiProviderConnection.findFirst.mockResolvedValue({
      id: 'connection-1',
      provider: 'OPENAI',
      model: 'test-model',
      endpointUrl: null,
      encryptedKey: service['encrypt']('test-api-key'),
    });
    prisma.aiUserLimits.findUnique.mockResolvedValue(null);
    entities.list.mockImplementation((type: string) =>
      Promise.resolve({
        data:
          type === 'DEVICE' ? [{ id: '11111111-1111-4111-8111-111111111111', name: 'Pump' }] : [],
      }),
    );
    telemetry.getKeys.mockResolvedValue(['temperature']);
    redis.acquire.mockResolvedValue(true);
    redis.consumeDaily.mockResolvedValue(1);
    redis.release.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    title: 'Pump dashboard',
                    widgets: [
                      { entityIndex: 0, telemetryKey: 'temperature', widgetType: 'value-tile' },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns a catalog-validated draft without saving a dashboard', async () => {
    const draft = await service.generate({ prompt: 'Show pump temperature' }, session);
    expect(draft.widgets[0].config).toMatchObject({
      entityId: '11111111-1111-4111-8111-111111111111',
      telemetryKey: 'temperature',
    });
    expect(draft.remainingRequests).toBe(19);
    expect(prisma.aiConversation.create).toHaveBeenCalledTimes(1);
    expect(dashboards.create).not.toHaveBeenCalled();
    expect(dashboards.save).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({ method: 'POST', redirect: 'manual' }),
    );
  });

  it('blocks daily limit exhaustion before contacting a provider', async () => {
    redis.consumeDaily.mockResolvedValue(-1);
    await expect(
      service.generate({ prompt: 'Show pump temperature' }, session),
    ).rejects.toMatchObject({ status: 429 });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.aiConversation.create).not.toHaveBeenCalled();
    expect(redis.release).toHaveBeenCalledTimes(1);
  });

  it('rejects a device outside the authorized catalog without persisting a draft', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    title: 'Wrong dashboard',
                    widgets: [
                      { entityIndex: 99, telemetryKey: 'temperature', widgetType: 'value-tile' },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
    });
    await expect(
      service.generate({ prompt: 'Show pump temperature' }, session),
    ).rejects.toMatchObject({ status: 502 });
    expect(prisma.aiConversation.create).not.toHaveBeenCalled();
    expect(dashboards.save).not.toHaveBeenCalled();
  });
});
