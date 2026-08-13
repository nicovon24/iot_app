import { useEffect } from 'react';
import { createWsClient, type SubscribeTarget } from '@\/lib';
import type { Alarm } from '@/types';

export function useLiveAlarms(target: SubscribeTarget | undefined, onAlarm: (alarm: Alarm) => void) {
  useEffect(() => {
    if (!target) return;

    const client = createWsClient('alarms');
    const unsubscribe = client.subscribe(target, (frame) => {
      if (frame.event !== 'alarm') return;
      onAlarm(frame.data);
    });

    return () => {
      unsubscribe();
      client.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.entityId, target?.entityType]);
}
