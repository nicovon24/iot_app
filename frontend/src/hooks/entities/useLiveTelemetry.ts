import { useEffect } from 'react';
import { createWsClient, type SubscribeTarget, type WsFrame } from '@/lib';

export function useLiveTelemetry(target: SubscribeTarget | undefined, onFrame: (frame: WsFrame) => void) {
  useEffect(() => {
    if (!target) return;

    const client = createWsClient('telemetry');
    const unsubscribe = client.subscribe(target, onFrame);

    return () => {
      unsubscribe();
      client.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.entityId, target?.entityType]);
}
