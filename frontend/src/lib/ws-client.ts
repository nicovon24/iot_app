import { getSessionToken } from './session';
import type { EntityType, Alarm } from '../types';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'ws://localhost:3001';

export interface SubscribeTarget {
  entityId: string;
  entityType: EntityType;
}

/**
 * Raw ThingsBoard timeseries-subscription wire format: per key, an array of
 * [ts, value] tuples (value always a string). This is TB's own tsSubCmds
 * payload passed straight through by the backend gateway — a different shape
 * than the REST /telemetry/latest endpoint's { [key]: { value, ts } } response.
 * Confirmed against a real live frame during 05-02 verification.
 */
export type WsTimeseriesUpdate = Record<string, [number, string][]>;

export type WsFrame =
  | { event: 'telemetry'; entityId: string; entityType: EntityType; data: WsTimeseriesUpdate }
  | { event: 'alarm'; entityId: string; entityType: EntityType; data: Alarm }
  | { event: 'error'; entityId?: string; message: string };

export type WsChannel = 'telemetry' | 'alarms';

export function createWsClient(channel: WsChannel) {
  const token = getSessionToken();
  const socket = new WebSocket(`${WS_BASE_URL}/ws/${channel}?token=${token ?? ''}`);

  function subscribe(target: SubscribeTarget, onMessage: (frame: WsFrame) => void): () => void {
    const send = () => socket.send(JSON.stringify({ event: 'subscribe', data: target }));
    if (socket.readyState === WebSocket.OPEN) {
      send();
    } else {
      socket.addEventListener('open', send, { once: true });
    }

    const handleMessage = (evt: MessageEvent) => {
      const frame = JSON.parse(evt.data as string) as WsFrame;
      onMessage(frame);
    };
    socket.addEventListener('message', handleMessage);

    return () => {
      socket.send(JSON.stringify({ event: 'unsubscribe', data: target }));
      socket.removeEventListener('message', handleMessage);
    };
  }

  function close() {
    socket.close();
  }

  return { socket, subscribe, close };
}
