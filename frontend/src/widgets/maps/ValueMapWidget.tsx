'use client';

import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { MapAutoResize } from './MapAutoResize';
import { MapStyleToggle } from './MapStyleToggle';
import { MAP_TILE_CONFIG, type MapTileStyle } from '@/lib/map-tiles';
import { HEAT_COLORS, HEAT_EMPTY, heatColor } from '@/lib/chart-palette';
import { formatTelemetryValue } from '@/lib/format';

export interface ValueMapEntry {
  id: string;
  name: string;
  lat: number;
  lng: number;
  value?: number;
}

export interface ValueMapWidgetProps {
  entries: ValueMapEntry[];
  isLoading?: boolean;
  title?: string;
  telemetryKey?: string;
  unit?: string;
  onEntityClick?: (entityId: string) => void;
}

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;

function buildIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

function FitToEntries({ entries }: { entries: ValueMapEntry[] }) {
  const map = useMap();

  useEffect(() => {
    if (entries.length === 0) return;
    const coords = entries.map((e) => [e.lat, e.lng] as [number, number]);
    if (coords.length === 1) {
      map.setView(coords[0], 13, { animate: false });
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15, animate: false });
    }
  }, [entries, map]);

  return null;
}

/**
 * The fleet on a map, each marker colored by its current reading rather than by alarm state.
 *
 * This is the readable answer to "show me the fleet's temperature spatially" when there are
 * tens of entities, not thousands: a true density heatmap of 20 points is 20 separate blobs,
 * while 20 colored markers are exactly 20 legible readings. The scale is the same sequential
 * ramp the calendar heatmap uses, so "hot" means the same thing across the dashboard.
 */
export function ValueMapWidget({
  entries,
  isLoading,
  title,
  telemetryKey,
  unit,
  onEntityClick,
}: ValueMapWidgetProps) {
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('color');

  if (isLoading && entries.length === 0) return <Centered text="Loading…" />;
  if (entries.length === 0) return <Centered text="No entities with location data" />;

  const values = entries.map((e) => e.value).filter((v): v is number => v !== undefined && Number.isFinite(v));
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const tile = MAP_TILE_CONFIG[tileStyle];

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-0">
      {title && (
        <h3 className="shrink-0 truncate border-b border-border px-4 py-3 text-sm font-semibold text-heading">
          {title}
        </h3>
      )}

      <div className="relative min-h-0 flex-1">
        <MapStyleToggle value={tileStyle} onChange={setTileStyle} />
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
          <TileLayer attribution={tile.attribution} url={tile.url} />
          <MapAutoResize />
          <FitToEntries entries={entries} />
          {entries.map((entry) => (
            <Marker
              key={entry.id}
              position={[entry.lat, entry.lng]}
              icon={buildIcon(heatColor(entry.value, min, max))}
            >
              <Popup>
                <div className="flex w-[184px] flex-col gap-2.5">
                  <div className="flex items-center gap-2 pr-4">
                    {/* Echoes the marker's own heat colour, tying the popup to the pin it came
                      * from when several sit close together. */}
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: heatColor(entry.value, min, max) }}
                    />
                    <p className="truncate text-sm font-semibold text-heading" title={entry.name}>
                      {entry.name}
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="truncate text-muted">{telemetryKey ?? 'value'}</span>
                    <span className="shrink-0 font-medium tabular-nums text-heading">
                      {entry.value === undefined
                        ? '—'
                        : `${formatTelemetryValue(String(entry.value)) ?? entry.value}${unit ? ` ${unit}` : ''}`}
                    </span>
                  </div>

                  {onEntityClick && (
                    <button
                      type="button"
                      onClick={() => onEntityClick(entry.id)}
                      style={{ background: 'var(--gradient-accent)' }}
                      className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Colour is the entire message here, so the scale it maps to is never left implicit. */}
        <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] flex items-center gap-1.5 rounded-md border border-border bg-surface-card px-2 py-1.5 text-[10px] text-body shadow-lg backdrop-blur-md">
          <span>{formatTelemetryValue(String(min)) ?? min}</span>
          {HEAT_COLORS.map((color) => (
            <span key={color} className="h-[9px] w-[9px] rounded-[2px]" style={{ background: color }} />
          ))}
          <span>
            {formatTelemetryValue(String(max)) ?? max}
            {unit ? ` ${unit}` : ''}
          </span>
          <span className="ml-1 flex items-center gap-1">
            <span className="h-[9px] w-[9px] rounded-[2px]" style={{ background: HEAT_EMPTY }} />
            no data
          </span>
        </div>
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
