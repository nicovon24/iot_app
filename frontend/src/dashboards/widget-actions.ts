'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * What clicking a widget's clickable unit (a table row, a card, a tile, a map marker) does.
 * Mirrors the `action` enum in backend/src/dashboards/widget-registry.ts.
 *
 * `NAVIGATE_STATE` is intentionally not here yet — dashboard states land in 10-05, and an
 * option pointing at destinations that don't exist would be dead UI.
 */
export type WidgetAction = 'NONE' | 'ENTITY_DETAILS';

export interface WidgetActionConfig {
  action?: WidgetAction;
  entityType?: 'DEVICE' | 'ASSET';
}

/**
 * The one place the entity-detail URL shape is defined. Used both by the widget action below
 * and by the map popup's explicit "Details" button — that button is NOT routed through
 * `useWidgetAction`, because it must keep working when a widget's action is 'NONE': the user
 * clicked a button labelled "Details", which is its own affordance, not the widget's row/card
 * click behaviour.
 */
export function entityDetailsHref(entityId: string, entityType: 'DEVICE' | 'ASSET' = 'DEVICE'): string {
  return `/entities/${entityId}?type=${entityType}`;
}

/**
 * The single navigation path for every widget. Returns `undefined` when the widget has no
 * action configured, which is also the signal each widget uses to decide whether to render a
 * clickable affordance at all — an inert row shouldn't advertise itself as a button.
 *
 * Centralised rather than calling `useRouter` inside each widget so that adding a destination
 * (a dashboard state, an external URL) is one change here instead of one per widget.
 */
export function useWidgetAction(config: WidgetActionConfig): ((entityId: string) => void) | undefined {
  const router = useRouter();
  const action = config.action ?? 'NONE';
  const entityType = config.entityType ?? 'DEVICE';

  const navigate = useCallback(
    (entityId: string) => {
      router.push(entityDetailsHref(entityId, entityType));
    },
    [router, entityType],
  );

  return action === 'ENTITY_DETAILS' ? navigate : undefined;
}
