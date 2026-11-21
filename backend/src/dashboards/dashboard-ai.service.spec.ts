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
