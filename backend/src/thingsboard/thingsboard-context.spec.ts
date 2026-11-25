import { Controller, Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AuthService, AppSession } from '../auth/auth.service';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { currentThingsboardSession, runWithThingsboardRequestContext } from './thingsboard-context';

@Controller('context-probe')
class ContextProbeController {
  @Get()
  getSession() {
    const session = currentThingsboardSession();
    return { userId: session?.tbUserId ?? null, url: session?.thingsboardUrl ?? null };
  }
}

describe('ThingsBoard HTTP request context', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const authService = {
      getSession: jest.fn(async (token: string): Promise<AppSession> => ({
        tbUserId: token,
        email: `${token}@example.com`,
        authority: 'TENANT_ADMIN',
        customerId: null,
        appRole: null,
        tbToken: 'test-token',
        thingsboardUrl: `https://${token}.example.com`,
      })),
    };
    const module = await Test.createTestingModule({
      controllers: [ContextProbeController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: APP_GUARD, useClass: SessionAuthGuard },
      ],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app
      .getHttpAdapter()
      .getInstance()
      .addHook('onRequest', (_request, _reply, done) => {
        runWithThingsboardRequestContext(done);
      });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('retains the session through the async guard and isolates concurrent requests', async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const [first, second] = await Promise.all([
      fastify.inject({
        method: 'GET',
        url: '/context-probe',
        headers: { 'x-session-token': 'first' },
      }),
      fastify.inject({
        method: 'GET',
        url: '/context-probe',
        headers: { 'x-session-token': 'second' },
      }),
    ]);

    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ userId: 'first', url: 'https://first.example.com' });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ userId: 'second', url: 'https://second.example.com' });
  });
});
