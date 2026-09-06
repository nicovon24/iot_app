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

/** How often an open socket re-checks that its session still exists in Redis. */
const SESSION_REVALIDATE_MS = 60_000;

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
  // Holds the in-flight session lookup, not the resolved session — see handleConnection.
  private readonly sessions = new WeakMap<WebSocket, Promise<AppSession | null>>();
  private readonly subscriptions = new WeakMap<WebSocket, Map<string, () => void>>();
  private readonly revalidators = new WeakMap<WebSocket, NodeJS.Timeout>();

  constructor(
    private readonly authService: AuthService,
    private readonly entitiesService: EntitiesService,
    private readonly tb: ThingsboardClientService,
    private readonly tbWs: ThingsboardWsService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage): Promise<void> {
    const url = new URL(request.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      client.close(1008, 'Missing or invalid session token');
      return;
    }

    // Both maps are populated synchronously, before the first await. Nest starts
    // dispatching inbound messages as soon as they arrive, and the browser sends
    // `subscribe` the instant the socket opens — so that message routinely reaches
    // handleSubscribe while this handler is still awaiting Redis. Storing the
    // pending promise rather than the resolved value means handleSubscribe awaits
    // this same lookup instead of finding an empty map and closing with 1008,
    // which the frontend reads as "session ended" and turns into a full logout.
    // (Verified: an immediate subscribe closed 1008 while one delayed 500ms did not.)
    const sessionPromise = resolveWsSession(token, this.authService);
    this.sessions.set(client, sessionPromise);
    this.subscriptions.set(client, new Map());

    const session = await sessionPromise;
    if (!session) {
      client.close(1008, 'Missing or invalid session token');
      return;
    }

    // Telemetry is server-pushed, so a subscribed client may never send another
    // frame — checking on inbound messages would never fire. Poll Redis instead,
    // so logout and session expiry actually terminate the stream rather than
    // leaving it live until the tab closes.
    const timer = setInterval(() => {
      void (async () => {
        try {
          const live = await resolveWsSession(token, this.authService);
          if (live) return;
        } catch (err) {
          // ioredis REJECTS when Redis is unreachable (MaxRetriesPerRequestError,
          // ~1.2s) — it does not resolve null. Treating that as "session ended"
          // would close every live dashboard during a blip, and the client has no
          // reconnect logic to recover with. Keep the socket, retry next tick.
          this.logger.warn(`Session revalidation failed, keeping socket open: ${String(err)}`);
          return;
        }
        this.handleDisconnect(client);
        client.close(1008, 'Session ended');
      })();
    }, SESSION_REVALIDATE_MS);
    this.revalidators.set(client, timer);
  }

  handleDisconnect(client: WebSocket): void {
    const timer = this.revalidators.get(client);
    if (timer) {
      clearInterval(timer);
      this.revalidators.delete(client);
    }

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
    const session = await this.sessions.get(client);
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
      const inScope = await isEntityInScope(session, entityId, entityType, this.entitiesService);
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
