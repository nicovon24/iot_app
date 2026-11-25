import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import WebSocket from 'ws';
import type { AppSession } from '../auth/auth.service';
import { EntityType } from '../types';
import { ThingsboardClientService } from './thingsboard-client.service';
import { thingsboardContext } from './thingsboard-context';

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 15_000;

/** A subscription uses the caller's own token and origin; sockets are never shared across users. */
@Injectable()
export class ThingsboardWsService implements OnModuleDestroy {
  private readonly logger = new Logger(ThingsboardWsService.name);
  private readonly closeSubscriptions = new Set<() => void>();

  constructor(private readonly tb: ThingsboardClientService) {}

  async subscribe(
    session: AppSession,
    entityType: EntityType,
    entityId: string,
    onUpdate: (data: Record<string, unknown>) => void,
  ): Promise<() => void> {
    if (!session.thingsboardUrl || !session.appSessionToken) {
      throw new Error('A ThingsBoard session is required for telemetry');
    }
    let socket: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;
    let closed = false;
    let attempts = 0;

    const close = () => {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
      this.closeSubscriptions.delete(close);
    };

    const connect = async (): Promise<void> => {
      const token = await thingsboardContext.run(session, () => this.tb.getToken());
      if (closed) return;
      const url = new URL('/api/ws/plugins/telemetry', session.thingsboardUrl);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('token', token);
      await new Promise<void>((resolve, reject) => {
        const next = new WebSocket(url);
        socket = next;
        next.once('open', () => {
          if (closed) {
            next.close();
            resolve();
            return;
          }
          attempts = 0;
          next.send(
            JSON.stringify({
              tsSubCmds: [{ entityType, entityId, scope: 'LATEST_TELEMETRY', cmdId: 1 }],
              historyCmds: [],
              attrSubCmds: [],
            }),
          );
          resolve();
        });
        next.on('message', (raw) => {
          try {
            const parsed = JSON.parse(raw.toString()) as {
              subscriptionId?: number;
              data?: Record<string, unknown>;
            };
            if (!closed && parsed.subscriptionId === 1 && parsed.data) onUpdate(parsed.data);
          } catch {
            this.logger.warn('Unparseable ThingsBoard telemetry WS frame');
          }
        });
        next.once('error', (error) => {
          this.logger.warn(`ThingsBoard telemetry WS error: ${error.message}`);
          reject(error);
        });
        next.once('close', () => {
          if (socket === next) socket = null;
          if (!closed) scheduleReconnect();
        });
      });
    };

    const scheduleReconnect = () => {
      if (closed || timer) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts++, RECONNECT_MAX_MS);
      timer = setTimeout(() => {
        timer = null;
        if (!closed) connect().catch(() => scheduleReconnect());
      }, delay);
    };

    this.closeSubscriptions.add(close);
    try {
      await connect();
      return close;
    } catch (error) {
      close();
      throw error;
    }
  }

  onModuleDestroy(): void {
    for (const close of this.closeSubscriptions) close();
  }
}
