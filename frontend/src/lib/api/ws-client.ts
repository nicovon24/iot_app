import { getSessionToken } from '../session';
import type { SubscribeTarget, WsFrame, WsChannel } from '@/types';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'ws://localhost:3001';

export type { SubscribeTarget, WsTimeseriesUpdate, WsFrame, WsChannel } from '@/types';

export function createWsClient(channel: WsChannel) {
  const token = getSessionToken();
  const socket = new WebSocket(`${WS_BASE_URL}/ws/${channel}?token=${token ?? ''}`);

  function subscribe(target: SubscribeTarget, onMessage: (frame: WsFrame) => void): () => void {
    const sendSubscribe = () => socket.send(JSON.stringify({ event: 'subscribe', data: target }));
    if (socket.readyState === WebSocket.OPEN) {
      sendSubscribe();
    } else {
      socket.addEventListener('open', sendSubscribe, { once: true });
    }

    const handleMessage = (evt: MessageEvent) => {
      const frame = JSON.parse(evt.data as string) as WsFrame;
      onMessage(frame);
    };
    socket.addEventListener('message', handleMessage);

    return () => {
      // The socket may still be CONNECTING when cleanup runs (e.g. React
      // effect double-invoke in dev, or an immediate unmount) — send() throws
      // InvalidStateError outside the OPEN state, so only unsubscribe if the
      // connection actually completed; otherwise just drop the pending
      // subscribe listener so it never fires for an unmounted target.
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: 'unsubscribe', data: target }));
      } else {
        socket.removeEventListener('open', sendSubscribe);
      }
      socket.removeEventListener('message', handleMessage);
    };
  }

  function close() {
    socket.close();
  }

  return { socket, subscribe, close };
}
