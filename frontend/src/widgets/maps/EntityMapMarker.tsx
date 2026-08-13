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
        <div className="flex w-[232px] flex-col gap-3">
          <div className="flex items-center gap-2 pr-4">
            {/* The dot repeats the marker's own alarm colour, so the popup is visibly tied to
              * the pin that opened it when several are close together. */}
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: hasActiveAlarm ? ALARM_COLOR : OK_COLOR }}
            />
            <p className="truncate text-sm font-semibold text-heading" title={name}>
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
                  <span className="shrink-0 font-medium tabular-nums text-heading">
                    {formatTelemetryValue(value.value)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-2.5">
            <p className="text-[11px] text-faint">
              {lastReportTs ? `Last report ${new Date(lastReportTs).toLocaleString()}` : 'No data yet'}
            </p>
            <button
              type="button"
              onClick={() => router.push(detailsHref)}
              style={{ background: 'var(--gradient-accent)' }}
              className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Details
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
