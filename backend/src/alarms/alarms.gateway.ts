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
import { EntityType, TbAlarm } from '../types';
import { AlarmsService } from './alarms.service';

interface SubscribePayload {
  entityId: string;
  entityType: EntityType;
}

const TB_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const VALID_ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];
const POLL_INTERVAL_MS = 7000;

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

/** Alarm identity + status/ackTs/clearTs — used to detect "changed" alarms across polls, not just "new" ones. */
function alarmFingerprint(alarm: TbAlarm): string {
  return `${alarm.id.id}:${alarm.status}:${alarm.ackTs}:${alarm.clearTs}`;
}

interface ClientSubscription {
  interval: ReturnType<typeof setInterval>;
  seen: Set<string>;
}

/**
 * Live alarm push (Phase 3, Plan 03-02). ThingsBoard's native alarm-subscription WS command
 * shape (alarmDataCmds) is more complex than the tsSubCmds used for telemetry and wasn't
 * confirmed working within this plan's effort budget — per 03-02-PLAN.md's explicit fallback,
 * this polls AlarmsService.getForEntity per subscribed entity and diffs against the last-seen
 * snapshot, emitting only new/changed alarms. Revisit with a native WS subscription if the
 * ~7s polling latency proves insufficient.
 */
@WebSocketGateway({ path: '/ws/alarms' })
export class AlarmsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AlarmsGateway.name);
  private readonly sessions = new WeakMap<WebSocket, AppSession>();
  private readonly subscriptions = new WeakMap<WebSocket, Map<string, ClientSubscription>>();

  constructor(
    private readonly authService: AuthService,
    private readonly entitiesService: EntitiesService,
    private readonly tb: ThingsboardClientService,
    private readonly alarmsService: AlarmsService,
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

    for (const sub of clientSubs.values()) {
      clearInterval(sub.interval);
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

    try {
      const inScope = await isEntityInScope(session, entityId, entityType, this.entitiesService, this.tb);
      if (!inScope) {
        client.send(JSON.stringify({ event: 'error', entityId, message: 'forbidden' }));
        return;
      }

      const seen = new Set<string>();

      const poll = async () => {
        try {
          const page = await this.alarmsService.getForEntity(entityId, entityType);
          for (const alarm of page.data) {
            const fingerprint = alarmFingerprint(alarm);
            if (seen.has(fingerprint)) continue;
            seen.add(fingerprint);
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ event: 'alarm', entityId, entityType, data: alarm }));
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'poll failed';
          this.logger.warn(`Alarm poll failed for ${key}: ${message}`);
        }
      };

      await poll();
      const interval = setInterval(poll, POLL_INTERVAL_MS);
      clientSubs.set(key, { interval, seen });
    } catch (err) {
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
    const sub = clientSubs.get(key);
    if (!sub) return;

    clearInterval(sub.interval);
    clientSubs.delete(key);
  }
}
