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
    aiConversation: { findFirst: jest.fn(), update: jest.fn() },
  };
  const dashboards = { getById: jest.fn() };
  const service = new DashboardAiService(
    config as ConfigService,
    prisma as unknown as PrismaService,
    {} as EntitiesService,
    {} as TelemetryService,
    {} as RedisService,
    dashboards as unknown as DashboardsService,
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

  it('links only a private conversation to an editable dashboard', async () => {
    prisma.aiConversation.findFirst.mockResolvedValue({ id: 'conversation-a', dashboardId: null });
    dashboards.getById.mockResolvedValue({ id: 'dashboard-a', createdBy: session.tbUserId });
    await service.linkConversation('conversation-a', 'dashboard-a', session);
    expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith({
      where: { id: 'conversation-a', tbUserId: 'user-a', instanceUrl: 'https://tb-one.example' },
    });
    expect(prisma.aiConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-a' },
      data: { dashboardId: 'dashboard-a' },
    });
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

  it('uses the current editor draft for a first revision and stores the assistant explanation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    title: 'Revised pump dashboard',
                    explanation: 'I kept the temperature and moved the widget.',
                    widgets: [{ existingWidgetIndex: 0, layout: { x: 6, y: 0, w: 6, h: 4 } }],
                  }),
                },
              ],
            },
          ],
        }),
    });
    const baseDraft = {
      title: 'Manual edits',
      widgets: [
        {
          widgetType: 'value-tile',
          config: {
            entityId: '11111111-1111-4111-8111-111111111111',
            entityType: 'DEVICE',
            telemetryKey: 'temperature',
          },
          layout: { x: 0, y: 0, w: 6, h: 4 },
        },
      ],
    };
    const result = await service.generate(
      { prompt: 'Move the temperature widget', baseDraft },
      session,
    );
    expect(result.widgets[0].layout.x).toBe(6);
    expect(result.message).toContain('I kept the temperature');
    expect(prisma.aiConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messages: {
            create: expect.arrayContaining([
              expect.objectContaining({ role: 'ASSISTANT', content: result.message }),
            ]),
          },
        }),
      }),
    );
    expect(dashboards.save).not.toHaveBeenCalled();
  });

  it('rejects editor context outside the visible catalog before contacting the model', async () => {
    const baseDraft = {
      title: 'Other device',
      widgets: [
        {
          widgetType: 'value-tile',
          config: {
            entityId: '22222222-2222-4222-8222-222222222222',
            entityType: 'DEVICE',
            telemetryKey: 'temperature',
          },
          layout: { x: 0, y: 0, w: 6, h: 4 },
        },
      ],
    };
    await expect(
      service.generate({ prompt: 'Show temperature', baseDraft }, session),
    ).rejects.toMatchObject({ status: 400 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('accepts text, alarm and multi-value widgets from the widget catalog', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    title: 'Operations',
                    widgets: [
                      { widgetType: 'label', text: 'Pump overview' },
                      { widgetType: 'alarm-count' },
                      { widgetType: 'value-cards', entityIndex: 0, telemetryKeys: ['temperature'] },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
    });
    const result = await service.generate({ prompt: 'Make an operations dashboard' }, session);
    expect(result.widgets.map((widget) => widget.widgetType)).toEqual([
      'label',
      'alarm-count',
      'value-cards',
    ]);
    expect(result.widgets[0].config).toEqual({ text: 'Pump overview' });
    expect(result.widgets[2].config).toMatchObject({ telemetryKeys: ['temperature'] });
  });

  it('turns an all-sensors table request into one fleet table even when the model returns cards', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    title: 'Sensors',
                    widgets: [
                      { widgetType: 'value-cards', entityIndex: 0, telemetryKeys: ['temperature'] },
                      { widgetType: 'value-tile', entityIndex: 0, telemetryKey: 'temperature' },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
    });

    const result = await service.generate({ prompt: 'Una tabla con todos los sensores' }, session);
    expect(result.widgets).toEqual([
      {
        widgetType: 'attributes-table',
        config: {
          entityScope: 'ALL',
          entityType: 'DEVICE',
          dataKeys: [{ source: 'TELEMETRY', key: '*' }],
        },
        layout: { x: 0, y: 0, w: 12, h: 6 },
      },
    ]);
    expect(result.message).toContain('A latest readings table');
    expect(dashboards.create).not.toHaveBeenCalled();
  });

  it('keeps existing dashboard widgets when adding an all-device table', async () => {
    const baseDraft = {
      title: 'Existing dashboard',
      widgets: [
        {
          widgetType: 'value-tile',
          config: {
            entityId: '11111111-1111-4111-8111-111111111111',
            entityType: 'DEVICE',
            telemetryKey: 'temperature',
          },
          layout: { x: 0, y: 0, w: 6, h: 4 },
        },
      ],
    };

    const result = await service.generate(
      { prompt: 'Agregá una tabla con todos los sensores', baseDraft },
      session,
    );

    expect(result.widgets).toHaveLength(2);
    expect(result.widgets[0]).toEqual(baseDraft.widgets[0]);
    expect(result.widgets[1]).toMatchObject({
      widgetType: 'attributes-table',
      config: { entityScope: 'ALL', entityType: 'DEVICE' },
      layout: { x: 0, y: 4, w: 12, h: 6 },
    });
  });

  it('uses a telemetry wildcard when an all-sensors table has no valid columns', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    title: 'Sensors',
                    widgets: [{ widgetType: 'label', text: 'Hello' }],
                  }),
                },
              ],
            },
          ],
        }),
    });

    const result = await service.generate(
      { prompt: 'Una tabla de todos los dispositivos' },
      session,
    );
    expect(result.widgets[0].config).toMatchObject({
      entityScope: 'ALL',
      dataKeys: [{ source: 'TELEMETRY', key: '*' }],
    });
  });

  it('keeps a telemetry column named explicitly in an all-sensors table request', async () => {
    const result = await service.generate(
      { prompt: 'Una tabla con todos los sensores y temperature' },
      session,
    );
    expect(result.widgets[0].config).toMatchObject({
      entityScope: 'ALL',
      dataKeys: [{ source: 'TELEMETRY', key: 'temperature' }],
    });
  });

  it('builds the requested temperature table when Groq returns malformed JSON', async () => {
    prisma.aiProviderConnection.findFirst.mockResolvedValue({
      id: 'connection-1',
      provider: 'GROQ',
      model: 'openai/gpt-oss-20b',
      endpointUrl: null,
      encryptedKey: service['encrypt']('test-api-key'),
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{ invalid' } }] }),
    });

    const result = await service.generate(
      { prompt: 'Quiero una tabla con todos mis devices mostrandome la temperatura' },
      session,
    );

    expect(result.widgets).toEqual([
      {
        widgetType: 'attributes-table',
        config: {
          entityScope: 'ALL',
          entityType: 'DEVICE',
          dataKeys: [{ source: 'TELEMETRY', key: 'temperature' }],
        },
        layout: { x: 0, y: 0, w: 12, h: 6 },
      },
    ]);
    expect(result.message).toContain('A latest readings table');
    expect(prisma.aiConversation.create).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed model output without saving a conversation or dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ output: [{ content: [{ type: 'output_text', text: 'not json' }] }] }),
    });
    await expect(service.generate({ prompt: 'Make a dashboard' }, session)).rejects.toMatchObject({
      status: 502,
    });
    expect(prisma.aiConversation.create).not.toHaveBeenCalled();
    expect(dashboards.save).not.toHaveBeenCalled();
  });

  it('rejects concurrent generation before contacting the provider', async () => {
    redis.acquire.mockResolvedValue(false);
    await expect(service.generate({ prompt: 'Make a dashboard' }, session)).rejects.toMatchObject({
      status: 429,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(redis.consumeDaily).not.toHaveBeenCalled();
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
