'use client';

import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib';
import type { EntityRef, TelemetryLatest } from '@/types';

/** Assets carry location telemetry the same way devices do, so the fleet map works for both. */
export type FleetEntityType = 'DEVICE' | 'ASSET';

/**
 * Pre-fetches device positions before the map ever mounts, so the map can be
 * created already centered/zoomed on the fleet instead of starting at the
 * world view and animating (flying) into place once positions arrive.
 */
export function useFleetPositions(devices: EntityRef[], entityType: FleetEntityType) {
  const keysResults = useQueries({
    queries: devices.map((device) => ({
      queryKey: ['telemetry', 'keys', device.id],
      queryFn: () => apiClient.get<string[]>(`/entities/${device.id}/telemetry/keys?type=${entityType}`),
    })),
  });
  const latestResults = useQueries({
    queries: devices.map((device) => ({
      queryKey: ['telemetry', 'latest', device.id, undefined],
      queryFn: () => apiClient.get<TelemetryLatest>(`/entities/${device.id}/telemetry/latest?type=${entityType}`),
    })),
  });

  const isLoading = keysResults.some((r) => r.isLoading) || latestResults.some((r) => r.isLoading);

  const positions: Record<string, [number, number]> = {};
  devices.forEach((device, i) => {
    const keys = keysResults[i]?.data ?? [];
    if (!keys.includes('latitude') || !keys.includes('longitude')) return;
    const telemetry = latestResults[i]?.data ?? {};
    const lat = telemetry.latitude ? Number(telemetry.latitude.value) : undefined;
    const lng = telemetry.longitude ? Number(telemetry.longitude.value) : undefined;
    if (lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      positions[device.id] = [lat, lng];
    }
  });

  return { positions, isLoading };
}
