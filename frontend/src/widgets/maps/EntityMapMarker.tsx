'use client';

import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { formatTelemetryValue } from '@/lib/format';
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

const OK_COLOR = '#22c55e';
const ALARM_COLOR = '#ef4444';

function buildIcon(hasActiveAlarm: boolean) {
  const color = hasActiveAlarm ? ALARM_COLOR : OK_COLOR;
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
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
        <div className="flex min-w-[200px] flex-col gap-2">
          <p className="font-semibold text-heading">{name}</p>
          <div className="map-popup-scroll flex max-h-48 flex-col gap-1 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-xs text-muted">No telemetry yet</p>
            ) : (
              entries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 text-xs">
                  <span className="text-muted">{key}</span>
                  <span className="font-medium text-body">{formatTelemetryValue(value.value)}</span>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-faint">
            {lastReportTs ? `Last report: ${new Date(lastReportTs).toLocaleString()}` : 'No data yet'}
          </p>
          <button
            type="button"
            onClick={() => router.push(detailsHref)}
            className="mt-1 cursor-pointer rounded-md bg-navy-950 px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
