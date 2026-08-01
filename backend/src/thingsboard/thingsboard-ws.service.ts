import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import WebSocket from 'ws';
import { ConfigService } from '../config/config.service';
import { EntityType } from '../types';
import { ThingsboardClientService } from './thingsboard-client.service';

interface SubscriptionEntry {
  entityType: EntityType;
  entityId: string;
  cmdId: number;
  refCount: number;
  listeners: Set<(data: Record<string, unknown>) => void>;
}

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 15000;

/**
 * Single multiplexed upstream WS connection to ThingsBoard's telemetry API, shared by
 * every TelemetryGateway client subscription (Phase 3). Mirrors the "one chokepoint"
 * pattern already used for REST (ThingsboardClientService) — this is the WS equivalent,
 * not a parallel ad-hoc client. Uses the same service-account credential as REST calls
 * (STATE.md: entity-scoped calls share the service-account credential in V1; this plan
 * does not change that model for WS either).
 */
@Injectable()
export class ThingsboardWsService implements OnModuleDestroy {
  private readonly logger = new Logger(ThingsboardWsService.name);
  private socket: WebSocket | null = null;
  private connecting: Promise<WebSocket> | null = null;
  private reconnectAttempts = 0;
  private nextCmdId = 1;
  private readonly subscriptions = new Map<string, SubscriptionEntry>();
  private destroyed = false;

  constructor(
    private readonly config: ConfigService,
    private readonly tb: ThingsboardClientService,
  ) {}

  /**
   * Subscribes to LATEST_TELEMETRY for one entity. Multiple callers subscribing to the
   * same entity share one upstream tsSubCmd (ref-counted) — only the first caller opens
   * it, only the last unsubscribe tears it down. Returns an unsubscribe function.
   */
  async subscribe(
    entityType: EntityType,
    entityId: string,
    onUpdate: (data: Record<string, unknown>) => void,
  ): Promise<() => void> {
    const key = `${entityType}:${entityId}`;
    let entry = this.subscriptions.get(key);

    if (!entry) {
      entry = { entityType, entityId, cmdId: this.nextCmdId++, refCount: 0, listeners: new Set() };
      this.subscriptions.set(key, entry);
    }

    entry.refCount++;
    entry.listeners.add(onUpdate);

    if (entry.refCount === 1) {
      const socket = await this.ensureConnected();
      this.sendSubscribe(socket, entry);
    }

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.unsubscribe(key, onUpdate);
    };
  }

  private unsubscribe(key: string, onUpdate: (data: Record<string, unknown>) => void): void {
    const entry = this.subscriptions.get(key);
    if (!entry) return;

    entry.listeners.delete(onUpdate);
    entry.refCount--;

    if (entry.refCount <= 0) {
      this.subscriptions.delete(key);
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendUnsubscribe(this.socket, entry);
      }
    }
  }

  private async ensureConnected(): Promise<WebSocket> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return this.socket;
    }
    if (this.connecting) {
      return this.connecting;
    }
    this.connecting = this.connect();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async connect(): Promise<WebSocket> {
    const token = await this.tb.getToken();
    const wsUrl = `${this.config.thingsboardUrl.replace(/^http/, 'ws')}/api/ws/plugins/telemetry?token=${token}`;

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);

      socket.once('open', () => {
        this.socket = socket;
        this.reconnectAttempts = 0;
        this.logger.log('Connected to ThingsBoard telemetry WS');
        // Rebuild every active subscription — ThingsBoard's WS has no session persistence
        // across a dropped socket, so a reconnect must resend every tsSubCmd currently in use.
        for (const entry of this.subscriptions.values()) {
          this.sendSubscribe(socket, entry);
        }
        resolve(socket);
      });

      socket.on('message', (raw) => this.handleMessage(raw.toString()));

      socket.once('error', (err) => {
        this.logger.error(`ThingsBoard telemetry WS error: ${err.message}`);
        reject(err);
      });

      socket.once('close', () => {
        if (this.socket === socket) this.socket = null;
        this.logger.warn('ThingsBoard telemetry WS closed');
        this.scheduleReconnect();
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.subscriptions.size === 0) return;

    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS);
    this.reconnectAttempts++;
    setTimeout(() => {
      if (this.destroyed || this.subscriptions.size === 0) return;
      this.ensureConnected().catch((err) => {
        this.logger.error(`ThingsBoard telemetry WS reconnect failed: ${err.message}`);
      });
    }, delay);
  }

  private sendSubscribe(socket: WebSocket, entry: SubscriptionEntry): void {
    socket.send(
      JSON.stringify({
        tsSubCmds: [
          {
            entityType: entry.entityType,
            entityId: entry.entityId,
            scope: 'LATEST_TELEMETRY',
            cmdId: entry.cmdId,
          },
        ],
        historyCmds: [],
        attrSubCmds: [],
      }),
    );
  }

  private sendUnsubscribe(socket: WebSocket, entry: SubscriptionEntry): void {
    socket.send(
      JSON.stringify({
        tsSubCmds: [{ entityType: entry.entityType, entityId: entry.entityId, cmdId: entry.cmdId, unsubscribe: true }],
        historyCmds: [],
        attrSubCmds: [],
      }),
    );
  }

  private handleMessage(raw: string): void {
    let parsed: { subscriptionId?: number; data?: Record<string, unknown>; errorMsg?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn(`Unparseable ThingsBoard telemetry WS frame: ${raw}`);
      return;
    }

    if (parsed.subscriptionId === undefined || !parsed.data) return;

    const entry = [...this.subscriptions.values()].find((e) => e.cmdId === parsed.subscriptionId);
    if (!entry) return;

    for (const listener of entry.listeners) {
      listener(parsed.data);
    }
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    this.socket?.close();
  }
}
