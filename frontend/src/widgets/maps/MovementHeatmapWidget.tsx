'use client';

import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { MapAutoResize } from './MapAutoResize';
import { MapStyleToggle } from './MapStyleToggle';
import { MAP_TILE_CONFIG, type MapTileStyle } from '@/lib';
import { HEAT_COLORS } from '@/lib';

export interface HeatPoint {
  lat: number;
  lng: number;
  /** 0-1 weight. Time-spent trails pass 1 for every point; value-weighted heatmaps pass the
   * normalized reading. */
  intensity: number;
}

export interface MovementHeatmapWidgetProps {
  points: HeatPoint[];
  isLoading?: boolean;
  title?: string;
  heightClassName?: string;
  /** Why there is nothing to draw, when the cell can tell them apart — "no data at all" and
   * "data that couldn't be paired" need different fixes. */
  emptyReason?: string;
}

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;

/** The sequential ramp as leaflet.heat's stop map, so the map's heat reads on the same scale
 * as the calendar heatmap rather than the plugin's default red/green. */
const GRADIENT = Object.fromEntries(
  HEAT_COLORS.map((color, i) => [(i + 1) / HEAT_COLORS.length, color]),
);

/**
 * Renders the heat layer imperatively and keeps it in sync.
 *
 * leaflet.heat is a plain Leaflet plugin with no React binding, so the layer is created once
 * against the map instance and torn down on unmount — leaving it attached would stack a new
 * layer over the old one every time the points change.
 */
function HeatLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const layer = L.heatLayer(
      points.map((p) => [p.lat, p.lng, p.intensity] as [number, number, number]),
      { radius: 22, blur: 18, maxZoom: 17, max: 1, gradient: GRADIENT },
    );
    layer.addTo(map);

    // Frame the trail on first paint; without this the map opens at the world view and the
    // heat is an invisible speck.
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
      padding: [30, 30],
      maxZoom: 16,
      animate: false,
    });

    return () => {
      layer.remove();
    };
  }, [points, map]);

  return null;
}

/**
 * Where a sensor spent its time, drawn from its raw position history — the football-player
 * heatmap, for hardware.
 *
 * Reads density, not position: overlapping points build heat, so a stop shows as a hot blob
 * while transit shows as a thin trail. That's the question a marker map can't answer, since a
 * marker only says where something is right now.
 */
export function MovementHeatmapWidget({
  points,
  isLoading,
  title,
  heightClassName = 'h-full',
  emptyReason,
}: MovementHeatmapWidgetProps) {
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('dark');

  if (isLoading && points.length === 0) return <Centered text="Loading position history…" />;
  if (points.length === 0) {
    return <Centered text={emptyReason ?? 'No position history in this time window'} />;
  }

  const tile = MAP_TILE_CONFIG[tileStyle];

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-0">
      {title && (
        <h3 className="shrink-0 truncate border-b border-border px-4 py-3 t-heading">
          {title}
        </h3>
      )}
      <div className={`relative min-h-0 flex-1 ${heightClassName}`}>
        <MapStyleToggle value={tileStyle} onChange={setTileStyle} />
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
          <TileLayer attribution={tile.attribution} url={tile.url} />
          <MapAutoResize />
          <HeatLayer points={points} />
        </MapContainer>
      </div>
    </div>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <div className="glass-card flex h-full items-center justify-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
