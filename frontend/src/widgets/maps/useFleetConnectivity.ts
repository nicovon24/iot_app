'use client';

import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import type { Attribute, EntityRef } from '@/types';
import type { FleetEntityType } from './fleet-positions';

export type Connectivity = 'online' | 'offline' | 'unknown';

/** The two server-scope keys ThingsBoard maintains for a device's connection. */
const KEYS = 'active,lastActivityTime';

/**
 * Connectivity for a fleet, read from ThingsBoard's own `active` attribute.
 *
 * `active` is server-scope and TB computes it from the device profile's inactivity timeout, so
 * this reports the platform's answer rather than inventing a staleness rule. The alternative —
 * comparing the newest telemetry timestamp against some threshold this app picks — would have
 * cost nothing but would mean "has not sent data lately", which is not the same claim: a
 * connected device that simply has nothing to report would read as down.
 *
 * Assets are skipped entirely. `active` is a device concept in TB, so asking for it on an asset
 * returns nothing and every asset would render as offline — a wrong answer is worse than no
 * answer, and `unknown` is drawn the same as online precisely so an absent signal never accuses
 * anything of being down.
 *
 * The query key is deliberately *not* the app's generic `['attributes', id]`. That one fetches
 * all three scopes with every key (three fat requests per entity) so the entity detail table can
 * show everything; here the question is one boolean, and `?keys=` narrows it to a payload the
 * backend already caches in Redis for five seconds.
 */
export function useFleetConnectivity(
  entities: EntityRef[],
  entityType: FleetEntityType,
): Map<string, Connectivity> {
  const isDevice = entityType === 'DEVICE';

  const results = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ['attributes', entity.id, 'SERVER_SCOPE', KEYS],
      queryFn: () =>
        apiClient.get<Attribute[]>(
          `/entities/${entity.id}/attributes?type=${entityType}&scope=SERVER_SCOPE&keys=${KEYS}`,
        ),
      enabled: isDevice,
    })),
  });

  const byId = new Map<string, Connectivity>();
  entities.forEach((entity, i) => {
    if (!isDevice) {
      byId.set(entity.id, 'unknown');
      return;
    }
    const attrs = results[i]?.data;
    if (!attrs) {
      // Still loading, or the request failed. Either way the honest answer is that we do not
      // know yet — not that the device is down.
      byId.set(entity.id, 'unknown');
      return;
    }
    const active = attrs.find((a) => a.key === 'active');
    // A device whose profile never set the attribute has no answer to give.
    byId.set(entity.id, active === undefined ? 'unknown' : active.value === true ? 'online' : 'offline');
  });

  return byId;
}
