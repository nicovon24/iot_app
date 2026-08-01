import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { AppSession, AuthService } from '../auth/auth.service';
import { isEntityInScope, resolveWsSession } from '../common/guards/ws-auth.util';
import { EntitiesService } from '../entities/entities.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { ThingsboardWsService } from '../thingsboard/thingsboard-ws.service';
import { EntityType } from '../types';

interface SubscribePayload {
  entityId: string;
  entityType: EntityType;
}

const TB_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const VALID_ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];

function isValidSubscribePayload(data: unknown): data is SubscribePayload {
  if (!data || typeof data !== 'object') return false;
  const { entityId, entityType } = data as Record<string, unknown>;
  return (
    typeof entityId === 'string' &&
    TB_ID_RE.test(entityId) &&
    typeof entityType === 'string' &&
    VALID_ENTITY_TYPES.includes(entityType as EntityType)
  );
}

/**
 * Client-facing WS telemetry protocol (Phase 3): a client connects with its app session
 * token as a `?token=` query param (browsers can't set custom headers on the WS handshake),
 * then sends `{event:"subscribe"|"unsubscribe", data:{entityId, entityType}}` frames.
 *
 * ThingsBoard credentials never reach the client — this gateway only relays data already
 * fetched by the backend's own upstream connection (ThingsboardWsService). Swagger cannot
 * document WS gateways ("try it out" doesn't support WS); see .paul/rules/testing.md for
 * the wscat-based manual verification approach used for this plan instead.
 */
@WebSocketGateway({ path: '/ws/telemetry' })
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TelemetryGateway.name);
  private readonly sessions = new WeakMap<WebSocket, AppSession>();
  private readonly subscriptions = new WeakMap<WebSocket, Map<string, () => void>>();

  constructor(
    private readonly authService: AuthService,
    private readonly entitiesService: EntitiesService,
    private readonly tb: ThingsboardClientService,
    private readonly tbWs: ThingsboardWsService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage): Promise<void> {
    const url = new URL(request.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');

    const session = token ? await resolveWsSession(token, this.authService) : null;
    if (!session) {
      client.close(1008, 'Missing or invalid session token');
      return;
    }

    this.sessions.set(client, session);
    this.subscriptions.set(client, new Map());
  }

  handleDisconnect(client: WebSocket): void {
    const clientSubs = this.subscriptions.get(client);
    if (!clientSubs) return;

    for (const unsubscribe of clientSubs.values()) {
      unsubscribe();
    }
    clientSubs.clear();
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const session = this.sessions.get(client);
    if (!session) {
      client.close(1008, 'No session');
      return;
    }

    if (!isValidSubscribePayload(data)) {
      client.send(JSON.stringify({ event: 'error', message: 'invalid entityId or entityType' }));
      return;
    }

    const { entityId, entityType } = data;
    const key = `${entityType}:${entityId}`;
    const clientSubs = this.subscriptions.get(client);
    if (!clientSubs || clientSubs.has(key)) {
      return;
    }

    // Reserve the key synchronously (before any await) so a second subscribe message for the
    // same entity arriving while this one is still in flight is rejected here instead of also
    // calling tbWs.subscribe — otherwise the two calls double-increment ThingsboardWsService's
    // ref count while only the last `set()` survives, permanently leaking the extra ref.
    clientSubs.set(key, () => {});

    try {
      const inScope = await isEntityInScope(session, entityId, entityType, this.entitiesService, this.tb);
      if (!inScope) {
        clientSubs.delete(key);
        client.send(JSON.stringify({ event: 'error', entityId, message: 'forbidden' }));
        return;
      }

      const unsubscribe = await this.tbWs.subscribe(entityType, entityId, (update) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ event: 'telemetry', entityId, entityType, data: update }));
        }
      });

      clientSubs.set(key, unsubscribe);
    } catch (err) {
      clientSubs.delete(key);
      const message = err instanceof Error ? err.message : 'subscribe failed';
      this.logger.warn(`Subscribe failed for ${key}: ${message}`);
      client.send(JSON.stringify({ event: 'error', entityId, message: 'subscribe failed' }));
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: WebSocket, @MessageBody() data: unknown): void {
    if (!isValidSubscribePayload(data)) return;

    const clientSubs = this.subscriptions.get(client);
    if (!clientSubs) return;

    const key = `${data.entityType}:${data.entityId}`;
    const unsubscribe = clientSubs.get(key);
    if (!unsubscribe) return;

    unsubscribe();
    clientSubs.delete(key);
  }
}
