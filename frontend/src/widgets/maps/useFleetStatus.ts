'use client';

import { useEntities, useGlobalAlarms } from '@/hooks';
import { alarmLevel, highestSeverity, LEVEL_COLORS, type AlarmLevel } from '@/lib';
import { useFleetPositions, type FleetEntityType } from './fleet-positions';
import { useFleetConnectivity, type Connectivity } from './useFleetConnectivity';
import type { AlarmSeverity, EntityRef } from '@/types';

/** Everything a marker, a dock row or a legend needs to know about one entity. */
export interface EntityStatus {
  connectivity: Connectivity;
  /** The most urgent active severity, or null. Named in full in the popup. */
  severity: AlarmSeverity | null;
  /** That severity's band — what actually drives colour. */
  level: AlarmLevel | null;
}

export interface FleetStatus {
  entities: EntityRef[];
  positions: Record<string, [number, number]>;
  statusById: Map<string, EntityStatus>;
  plotted: EntityRef[];
  /** Ids carrying at least one active alarm — the count the overlay reports. */
  alarmedIds: string[];
  isLoading: boolean;
}

/** The green an entity wears when nothing is wrong with it. */
const OK_COLOR = 'var(--color-accent)';

/**
 * The colour a status paints, on a marker or on a legend swatch.
 *
 * Connectivity is deliberately *not* part of this: the two are orthogonal, and collapsing them
 * into one colour is what loses information — an offline device with a critical alarm would
 * stop looking critical. Colour answers "is something wrong"; the caller answers "is it
 * reachable" with fill versus outline.
 */
export function statusColor(status: EntityStatus | undefined): string {
  if (!status?.level) return OK_COLOR;
  return LEVEL_COLORS[status.level];
}

/**
 * The fleet's state for one scope, shared by everything on the Maps screen.
 *
 * The map, the dock and the status overlay all need the same answers — what exists, where it is,
 * whether it is shouting and whether it is reachable — and all four call this. That reads like
 * duplicated work and is not: every query underneath is keyed, so React Query serves one cache
 * entry to all of them.
 *
 * Alarms come from a single `useGlobalAlarms({})` rather than one request per marker. Sending no
 * pageSize makes the backend return the whole set unpaginated, so nothing is lost by asking once
 * — and it removes the N per-entity alarm requests the map used to fire alongside this very
 * call, which roughly pays for the N attribute requests connectivity adds.
 */
export function useFleetStatus(scope: FleetEntityType): FleetStatus {
  const devicesQuery = useEntities('DEVICE');
  const assetsQuery = useEntities('ASSET');
  const alarmsQuery = useGlobalAlarms({});

  const entities = (scope === 'DEVICE' ? devicesQuery.data?.data : assetsQuery.data?.data) ?? [];
  const { positions, isLoading: positionsLoading } = useFleetPositions(entities, scope);
  const connectivity = useFleetConnectivity(entities, scope);

  // Group the active alarms by originator once, then reduce each group to its worst severity.
  const severitiesById = new Map<string, string[]>();
  for (const alarm of alarmsQuery.data?.data ?? []) {
    if (alarm.status !== 'ACTIVE_UNACK' && alarm.status !== 'ACTIVE_ACK') continue;
    const list = severitiesById.get(alarm.originator.id);
    if (list) list.push(alarm.severity);
    else severitiesById.set(alarm.originator.id, [alarm.severity]);
  }

  const statusById = new Map<string, EntityStatus>();
  for (const entity of entities) {
    const severity = highestSeverity(severitiesById.get(entity.id) ?? []);
    statusById.set(entity.id, {
      connectivity: connectivity.get(entity.id) ?? 'unknown',
      severity,
      level: severity ? alarmLevel(severity) : null,
    });
  }

  const listLoading = scope === 'DEVICE' ? devicesQuery.isLoading : assetsQuery.isLoading;

  return {
    entities,
    positions,
    statusById,
    plotted: entities.filter((e) => positions[e.id]),
    alarmedIds: entities.filter((e) => statusById.get(e.id)?.level).map((e) => e.id),
    isLoading: listLoading || positionsLoading,
  };
}
