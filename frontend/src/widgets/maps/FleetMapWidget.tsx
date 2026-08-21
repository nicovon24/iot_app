'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import { useQueries } from '@tanstack/react-query';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { apiClient } from '@/lib';
import { useEntities } from '@/hooks';
import { useTelemetryKeys, useTelemetryLatest } from '@/hooks';
import { useEntityAlarms } from '@/hooks';
import { entityDetailsHref } from '@/components';
import { EntityMapMarker } from './EntityMapMarker';
import { MapAutoResize } from './MapAutoResize';
import { MapStyleToggle } from './MapStyleToggle';
import { MAP_TILE_CONFIG, type MapTileStyle } from '@/lib';
import { MapSkeleton } from '@/components';
import type { EntityRef, TelemetryLatest } from '@/types';

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;
const SINGLE_DEVICE_ZOOM = 13;

/** Assets carry location telemetry the same way devices do, so the fleet map works for both. */
export type FleetEntityType = 'DEVICE' | 'ASSET';

/**
 * Pre-fetches device positions before the map ever mounts, so the map can be
 * created already centered/zoomed on the fleet instead of starting at the
 * world view and animating (flying) into place once positions arrive.
 */
function useFleetPositions(devices: EntityRef[], entityType: FleetEntityType) {
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

function computeInitialView(positions: Record<string, [number, number]>): {
  center: [number, number];
  zoom: number;
} {
  const coords = Object.values(positions);
  if (coords.length === 0) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  if (coords.length === 1) return { center: coords[0], zoom: SINGLE_DEVICE_ZOOM };

  const lats = coords.map((c) => c[0]);
  const lngs = coords.map((c) => c[1]);
  return {
    center: [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2],
    zoom: 11,
  };
}

function FitToDevices({ positions }: { positions: Record<string, [number, number]> }) {
  const map = useMap();
  const fittedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const coords = Object.values(positions);
    if (coords.length === 0) return;

    const key = Object.keys(positions).sort().join(',');
    if (fittedKeyRef.current === key) return;
    fittedKeyRef.current = key;

    if (coords.length === 1) {
      map.setView(coords[0], SINGLE_DEVICE_ZOOM, { animate: false });
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15, animate: false });
    }
  }, [positions, map]);

  return null;
}

function FleetMarker({
  device,
  entityType,
  onPosition,
}: {
  device: EntityRef;
  entityType: FleetEntityType;
  onPosition: (id: string, position: [number, number] | null) => void;
}) {
  const keysQuery = useTelemetryKeys(device.id, entityType);
  const hasLocation =
    (keysQuery.data ?? []).includes('latitude') && (keysQuery.data ?? []).includes('longitude');

  const telemetryQuery = useTelemetryLatest(device.id, entityType);
  const alarmsQuery = useEntityAlarms(device.id, entityType);

  const telemetry = telemetryQuery.data ?? {};
  const lat = telemetry.latitude ? Number(telemetry.latitude.value) : undefined;
  const lng = telemetry.longitude ? Number(telemetry.longitude.value) : undefined;
  const hasValidCoords =
    hasLocation && lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng);

  useEffect(() => {
    onPosition(device.id, hasValidCoords ? [lat as number, lng as number] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.id, hasValidCoords, lat, lng]);

  if (!hasValidCoords) return null;

  const hasActiveAlarm = (alarmsQuery.data?.data ?? []).some(
    (a) => a.status === 'ACTIVE_UNACK' || a.status === 'ACTIVE_ACK',
  );
  const tsValues = Object.values(telemetry).map((v) => v.ts);
  const lastReportTs = tsValues.length > 0 ? Math.max(...tsValues) : undefined;

  return (
    <EntityMapMarker
      lat={lat as number}
      lng={lng as number}
      name={device.name}
      hasActiveAlarm={hasActiveAlarm}
      telemetry={telemetry}
      lastReportTs={lastReportTs}
      detailsHref={entityDetailsHref(device.id, entityType)}
    />
  );
}

export interface FleetMapWidgetProps {
  /** Tailwind height class for the map container. Defaults to /map's own fixed height. */
  heightClassName?: string;
  /** Which entity kind to plot. Defaults to devices — /map's existing behaviour. */
  entityType?: FleetEntityType;
  /** Poll interval for the entity list, so entities registered later appear on their own. */
  refetchInterval?: number;
}

export function FleetMapWidget({
  heightClassName = 'h-[32rem]',
  entityType = 'DEVICE',
  refetchInterval,
}: FleetMapWidgetProps = {}) {
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('color');
  const { data, isLoading, isError, error } = useEntities(entityType, undefined, { refetchInterval });
  const devices = data?.data ?? [];
  const [positions, setPositions] = useState<Record<string, [number, number]>>({});
  const { positions: prefetchedPositions, isLoading: positionsLoading } = useFleetPositions(devices, entityType);

  const handlePosition = useCallback((id: string, position: [number, number] | null) => {
    setPositions((prev) => {
      if (!position) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const existing = prev[id];
      if (existing && existing[0] === position[0] && existing[1] === position[1]) return prev;
      return { ...prev, [id]: position };
    });
  }, []);

  if (isLoading || positionsLoading) {
    return (
      <div className={`relative ${heightClassName} overflow-hidden rounded-xl border border-border`}>
        <MapSkeleton />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className={`flex ${heightClassName} items-center justify-center rounded-xl border border-border bg-surface-card`}>
        <p className="text-sm text-danger">Failed to load: {message}</p>
      </div>
    );
  }

  const tile = MAP_TILE_CONFIG[tileStyle];
  const initialView = computeInitialView(prefetchedPositions);

  return (
    <div className={`relative ${heightClassName} overflow-hidden rounded-xl border border-border shadow-sm`}>
      <MapStyleToggle value={tileStyle} onChange={setTileStyle} />
      <MapContainer center={initialView.center} zoom={initialView.zoom} className="h-full w-full">
        <TileLayer attribution={tile.attribution} url={tile.url} />
        <MapAutoResize />
        <FitToDevices positions={positions} />
        <MarkerClusterGroup chunkedLoading>
          {devices.map((device) => (
            <FleetMarker key={device.id} device={device} entityType={entityType} onPosition={handlePosition} />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
