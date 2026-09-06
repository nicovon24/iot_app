import { useEffect } from 'react';
import { createWsClient, endSession, toastError, type SubscribeTarget, type WsFrame } from '@/lib';

export function useLiveTelemetry(
  target: SubscribeTarget | undefined,
  onFrame: (frame: WsFrame) => void,
) {
  useEffect(() => {
    if (!target) return;

    const client = createWsClient('telemetry');
    const unsubscribe = client.subscribe(target, onFrame);

    // Nothing watched the socket before this, so a drop left the UI showing stale
    // values indefinitely with no indication it had stopped updating.
    client.onClosed(({ sessionEnded }) => {
      if (sessionEnded) endSession();
      else toastError('Live telemetry disconnected', 'Reload the page to reconnect.');
    });

    return () => {
      unsubscribe();
      client.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.entityId, target?.entityType]);
}
