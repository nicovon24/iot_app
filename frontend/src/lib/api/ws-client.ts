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

  // Set when the caller closes deliberately (unmount, navigation), so onClosed
  // stays silent for those — otherwise every page change would report a dropped
  // connection.
  let closedByCaller = false;

  function close() {
    closedByCaller = true;
    socket.close();
  }

  /**
   * Without this the socket dropping is completely silent — a backend restart, a
   * network blip, or the server ending the session all leave the dashboard frozen
   * on stale values with no indication and no recovery short of a page reload.
   *
   * Close code 1008 is the backend's "session ended" (logout or TTL expiry): the
   * session is genuinely gone, so retrying is pointless and the caller should send
   * the user to login. Any other code is a transport failure worth surfacing.
   */
  function onClosed(handler: (info: { sessionEnded: boolean }) => void) {
    socket.addEventListener('close', (evt) => {
      if (closedByCaller) return;
      handler({ sessionEnded: evt.code === 1008 });
    });
  }

  return { socket, subscribe, close, onClosed };
}
