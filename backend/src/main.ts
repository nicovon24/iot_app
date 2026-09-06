import 'dotenv/config';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // Lets @WebSocketGateway() decorators (TelemetryGateway, Phase 3) run over the same
  // HTTP server via the `ws` library, instead of Fastify's own websocket plugin — keeps
  // Nest's standard gateway/DI conventions rather than hand-rolling a Fastify route.
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.register(helmet, { contentSecurityPolicy: false });

  // The real point of the rate limiter. POST /auth/login forwards credentials
  // straight to ThingsBoard, so without this the API is a convenient brute-force
  // proxy against TB accounts. Keyed by IP, since an unauthenticated request has
  // no session token to key on.
  //
  // This hook MUST be added before @fastify/rate-limit is registered: the plugin
  // reads per-route config in its own onRoute hook, Fastify runs onRoute hooks in
  // registration order, and a hook added afterwards mutates the options too late
  // to be seen (verified — the route reported the global limit until this moved).
  // Nest owns route registration, so a hook is the only place to set per-handler
  // Fastify route config.
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRoute', (routeOptions) => {
      if (routeOptions.url === '/auth/login' && routeOptions.method === 'POST') {
        routeOptions.config = {
          ...routeOptions.config,
          rateLimit: { max: 5, timeWindow: '1 minute' },
        };
      }
    });

  // Sized against how the frontend actually behaves, not how a person clicks:
  // dashboard widgets poll telemetry every 5s EACH (TELEMETRY_POLL_MS), so a
  // twenty-widget board is ~240 req/min from a single tab, and the query client
  // retries once on failure. A cap in the hundreds would look like an outage.
  // This global limit is a blunt safety net; the meaningful control is the much
  // tighter per-route limit on POST /auth/login, which is the endpoint that
  // proxies credentials to ThingsBoard.
  // Keyed by session rather than IP so users behind one NAT get their own bucket.
  await app.register(rateLimit, {
    max: 1200,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req.headers['x-session-token'] as string) ?? req.ip,
  });

  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IoT App API')
    .setDescription(
      'Backend API proxying ThingsBoard — entities, attributes, telemetry, alarms, clients',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-session-token',
        in: 'header',
        description: 'Session token from POST /auth/login',
      },
      'session-token',
    )
    .build();
  // Swagger documents every route and needs no auth to read, so keep it out of
  // production builds.
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.port, '0.0.0.0');
}

bootstrap();
