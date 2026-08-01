import 'dotenv/config';
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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IoT App API')
    .setDescription('Backend API proxying ThingsBoard — entities, attributes, telemetry, alarms, clients')
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-session-token', in: 'header', description: 'Session token from POST /auth/login' },
      'session-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.port, '0.0.0.0');
}

bootstrap();
