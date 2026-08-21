'use client';

import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useTelemetryLatest } from '@/hooks';
import { useEntityAlarms } from '@/hooks';
import { entityDetailsHref } from '@/components';
import { EntityMapMarker } from './EntityMapMarker';
import { MapAutoResize } from './MapAutoResize';
import { MapStyleToggle } from './MapStyleToggle';
import { MAP_TILE_CONFIG, type MapTileStyle } from '@/lib';
import type { EntityType } from '@/types';

export interface MapWidgetProps {
  id: string;
  type: EntityType;
  name: string;
  lat: number;
  lng: number;
  /** Tailwind height class. Defaults to a fixed height for standalone (non-grid) usage;
   * dashboard cells pass `h-full` so the map fills whatever the grid cell is sized to. */
  heightClassName?: string;
}

export function MapWidget({ id, type, name, lat, lng, heightClassName = 'h-96' }: MapWidgetProps) {
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
    <div className={`relative ${heightClassName} overflow-hidden rounded-xl border border-border shadow-sm`}>
      <MapStyleToggle value={tileStyle} onChange={setTileStyle} />
      <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full">
        <TileLayer attribution={tile.attribution} url={tile.url} />
        <MapAutoResize />
        <EntityMapMarker
          lat={lat}
          lng={lng}
          name={name}
          hasActiveAlarm={hasActiveAlarm}
          telemetry={telemetry}
          lastReportTs={lastReportTs}
          detailsHref={entityDetailsHref(id, type as 'DEVICE' | 'ASSET')}
        />
      </MapContainer>
    </div>
  );
}
