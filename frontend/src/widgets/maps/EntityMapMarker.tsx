'use client';

import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { formatTelemetryValue } from '@/lib';
import type { TelemetryLatest } from '@/types';

export interface EntityMapMarkerProps {
  lat: number;
  lng: number;
  name: string;
  hasActiveAlarm: boolean;
  telemetry: TelemetryLatest;
  lastReportTs?: number;
  detailsHref: string;
}

// The healthy state is the brand green; the ring is the app's dark ink rather than white,
// which reads as a hole punched in the dark basemap instead of a bright dot with a halo.
const OK_COLOR = '#2ee89a';
const ALARM_COLOR = '#ff5f56';
const MARKER_RING = '#04120c';

function buildIcon(hasActiveAlarm: boolean) {
  const color = hasActiveAlarm ? ALARM_COLOR : OK_COLOR;
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid ${MARKER_RING};box-shadow:0 0 6px ${color}80;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

export function EntityMapMarker({
  lat,
  lng,
  name,
  hasActiveAlarm,
  telemetry,
  lastReportTs,
  detailsHref,
}: EntityMapMarkerProps) {
  const router = useRouter();
  const entries = Object.entries(telemetry);

  return (
    <Marker position={[lat, lng]} icon={buildIcon(hasActiveAlarm)}>
      <Popup>
        <div className="flex w-[232px] flex-col gap-3">
          <div className="flex items-center gap-2 pr-4">
            {/* The dot repeats the marker's own alarm colour, so the popup is visibly tied to
              * the pin that opened it when several are close together. */}
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: hasActiveAlarm ? ALARM_COLOR : OK_COLOR }}
            />
            <p className="truncate t-heading" title={name}>
              {name}
            </p>
          </div>

          <div className="map-popup-scroll -mx-1 flex max-h-48 flex-col overflow-y-auto px-1">
            {entries.length === 0 ? (
              <p className="text-xs text-muted">No telemetry yet</p>
            ) : (
              entries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 text-xs last:border-b-0"
                >
                  <span className="truncate text-muted" title={key}>
                    {key}
                  </span>
                  {/* Tabular figures so the values form a straight column instead of jittering
                    * with each digit's width. */}
                  <span className="shrink-0 t-metric-sm text-sm">
                    {formatTelemetryValue(value.value)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-2.5">
            <p className="t-meta">
              {lastReportTs ? `Last report ${new Date(lastReportTs).toLocaleString()}` : 'No data yet'}
            </p>
            <button
              type="button"
              onClick={() => router.push(detailsHref)}
              className="btn-accent cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold"
            >
              Details
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
