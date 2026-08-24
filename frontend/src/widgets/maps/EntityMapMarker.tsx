'use client';

import L from 'leaflet';
import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { formatTelemetryValue, LEVEL_COLORS } from '@/lib';
import type { TelemetryLatest } from '@/types';
import type { EntityStatus } from './useFleetStatus';

export interface EntityMapMarkerProps {
  lat: number;
  lng: number;
  name: string;
  status: EntityStatus;
  telemetry: TelemetryLatest;
  lastReportTs?: number;
  detailsHref: string;
}

// The healthy green, and the ink every marker is ringed or filled with. The ring is the app's
// dark ink rather than white, which reads as a hole punched in the basemap instead of a bright
// dot with a halo — and it is what keeps a marker legible on the light Streets tiles, where an
// unringed amber would disappear.
const OK_COLOR = '#34d399';
const MARKER_INK = '#04120c';

/** Marker colour: green when nothing is wrong, the alarm band's colour when something is. */
export function markerColor(status: EntityStatus): string {
  return status.level ? LEVEL_COLORS[status.level] : OK_COLOR;
}

/**
 * Two facts on one mark, plus a sign of life.
 *
 * Colour carries the alarm band; fill carries reachability. An online entity is a solid diamond
 * in its state colour, an offline one is hollow — dark body, coloured stroke — so a device that
 * is both down *and* critical still reads as critical, which a single-colour scheme cannot do:
 * it has to pick one of the two to tell you about and silently drops the other.
 *
 * Both variants always contain the dark ink, as body or as border, which is what gives the mark
 * a guaranteed edge against any basemap the style toggle can produce.
 *
 * Around that sits a ring that expands and fades on a loop, and a soft glow under the body. The
 * ring is drawn *behind* the diamond and inherits the same colour, so a pin reads as live
 * without the halo ever obscuring the shape that carries the meaning. Both are pure
 * transform/opacity, which the compositor handles without touching layout — and both stop dead
 * under prefers-reduced-motion (see globals.css).
 */
function buildIcon(status: EntityStatus) {
  const color = markerColor(status);
  const offline = status.connectivity === 'offline';

  // The hollow variant runs a pixel larger: a stroke reads smaller than a solid of the same
  // box, so matching the numbers would make offline markers look like they had shrunk.
  const size = offline ? 10 : 9;
  const body = offline
    ? `background:${MARKER_INK};border:2px solid ${color}`
    : `background:${color};border:1px solid ${MARKER_INK}`;

  // A dimmer halo on an offline pin: it is still reporting its presence, but a dark body with a
  // full-strength glow would read as brighter than the online marker it sits next to.
  const glow = offline ? `0 0 8px ${color}55` : `0 0 10px ${color}99`;

  return L.divIcon({
    className: '',
    html:
      `<div style="position:relative;width:${size}px;height:${size}px">` +
      // The pulse keeps its own 1px stroke rather than reusing the body's, so the offline
      // marker's heavier border does not make its halo thicker too.
      `<div class="animate-marker-pulse" style="position:absolute;inset:0;border:1px solid ${color}"></div>` +
      `<div style="position:absolute;inset:0;transform:rotate(45deg);${body};box-shadow:${glow}"></div>` +
      `</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 2)],
  });
}

/** What the popup calls the state, in full rather than as a colour the reader has to decode. */
function statusLabel(status: EntityStatus): string {
  const alarm = status.severity ? status.severity : 'No active alarms';
  if (status.connectivity === 'offline') return `${alarm} · Offline`;
  if (status.connectivity === 'online') return `${alarm} · Online`;
  return alarm;
}

export function EntityMapMarker({
  lat,
  lng,
  name,
  status,
  telemetry,
  lastReportTs,
  detailsHref,
}: EntityMapMarkerProps) {
  const router = useRouter();
  const entries = Object.entries(telemetry);

  // A fresh L.divIcon on every render made Leaflet tear down and rebuild the marker's DOM each
  // time any parent state moved. It only actually changes on these two.
  const icon = useMemo(
    () => buildIcon(status),
    [status.level, status.connectivity], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const color = markerColor(status);
  const offline = status.connectivity === 'offline';

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div className="flex w-[232px] flex-col gap-3">
          <div className="flex items-center gap-2 pr-4">
            {/* The dot repeats the marker's own colour *and* its fill, so the popup is visibly
              * tied to the pin that opened it when several sit close together. */}
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rotate-45"
              style={
                offline
                  ? { background: MARKER_INK, border: `2px solid ${color}` }
                  : { background: color }
              }
            />
            <p className="truncate t-heading" title={name}>
              {name}
            </p>
          </div>

          <p className="t-label" style={status.level ? { color } : undefined}>
            {statusLabel(status)}
          </p>

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
              className="btn-accent cursor-pointer px-3 py-1.5 text-xs font-semibold"
            >
              Details
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
