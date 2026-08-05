'use client';

import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useTelemetryLatest } from '@/hooks/useEntityTelemetry';
import { useEntityAlarms } from '@/hooks/useEntityAlarms';
import { EntityMapMarker } from './EntityMapMarker';
import { MapStyleToggle } from './MapStyleToggle';
import { MAP_TILE_CONFIG, type MapTileStyle } from '@/lib/map-tiles';
import type { EntityType } from '@/types';

export interface MapWidgetProps {
  id: string;
  type: EntityType;
  name: string;
  lat: number;
  lng: number;
}

export function MapWidget({ id, type, name, lat, lng }: MapWidgetProps) {
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('color');
  const alarmsQuery = useEntityAlarms(id, type);
  const telemetryQuery = useTelemetryLatest(id, type);

  const hasActiveAlarm = (alarmsQuery.data?.data ?? []).some(
    (a) => a.status === 'ACTIVE_UNACK' || a.status === 'ACTIVE_ACK',
  );
  const telemetry = telemetryQuery.data ?? {};
  const tsValues = Object.values(telemetry).map((v) => v.ts);
  const lastReportTs = tsValues.length > 0 ? Math.max(...tsValues) : undefined;
  const tile = MAP_TILE_CONFIG[tileStyle];

  return (
    <div className="relative h-96 overflow-hidden rounded-xl border border-border shadow-sm">
      <MapStyleToggle value={tileStyle} onChange={setTileStyle} />
      <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full">
        <TileLayer attribution={tile.attribution} url={tile.url} />
        <EntityMapMarker
          lat={lat}
          lng={lng}
          name={name}
          hasActiveAlarm={hasActiveAlarm}
          telemetry={telemetry}
          lastReportTs={lastReportTs}
          detailsHref={`/entities/${id}?type=${type}`}
        />
      </MapContainer>
    </div>
  );
}
