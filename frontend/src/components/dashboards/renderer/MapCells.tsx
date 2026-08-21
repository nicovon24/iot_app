'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTelemetryLatest } from '@/hooks';

// Leaflet touches `window` at module scope, so these widgets must never load during SSR.
const MapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.MapWidget), { ssr: false });
const FleetMapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.FleetMapWidget), { ssr: false });
const ValueMapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.ValueMapWidget), { ssr: false });
const MovementHeatmapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.MovementHeatmapWidget), {
  ssr: false,
});
import { useWidgetAction } from '../widget-config/widget-actions';
import { pairCoordinates } from '../datasource/pair-coordinates';
import { useDashboardTimeWindow } from '../canvas/TimeWindowPicker';
import {
  isAllScope,
  resolveHistoryWindow,
  useDatasourceEntities,
  useMultiKeyLatestForEntities,
  useRawHistoryForEntities,
} from '../use-widget-datasource';
import { MAX_SERIES } from '@/lib';
import { ENTITY_POLL_MS, MAX_TILES, WidgetUnavailable, type EntityWidgetConfig } from './shared';

export function ValueMapCell({ config }: { config: EntityWidgetConfig }) {
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);
  const onEntityClick = useWidgetAction(config);

  const shown = entities.slice(0, MAX_TILES);
  // Position and the coloured value come from the same latest-telemetry payload, so one fetch
  // per entity covers both rather than one for coordinates and another for the reading.
  const latest = useMultiKeyLatestForEntities(shown, entityType, [
    'latitude',
    'longitude',
    config.telemetryKey ?? '',
  ]);

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;

  const entries = shown
    .map((e) => {
      const readings = latest.byEntity[e.id] ?? {};
      const lat = Number(readings.latitude?.value);
      const lng = Number(readings.longitude?.value);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
      const raw = config.telemetryKey ? readings[config.telemetryKey]?.value : undefined;
      const value = raw !== undefined ? Number(raw) : undefined;
      return {
        id: e.id,
        name: e.name,
        lat,
        lng,
        value: value !== undefined && Number.isFinite(value) ? value : undefined,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  return (
    <ValueMapWidget
      title={config.title}
      entries={entries}
      telemetryKey={config.telemetryKey}
      unit={config.unit}
      isLoading={latest.isLoading}
      onEntityClick={onEntityClick}
    />
  );
}

/**
 * Formats a fix's timestamp for the empty-state message: a named month plus how long ago.
 *
 * Not toLocaleString() — that renders "8/3/2026", which reads as 8 March or 3 August depending
 * on the locale, and the whole point of this message is telling the user how far back to widen
 * the range. Spelling the month out removes the ambiguity, and the relative part is what
 * actually answers "which preset do I need".
 */
function formatFix(ts: number) {
  const absolute = new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const days = Math.round((Date.now() - ts) / 86_400_000);
  if (days <= 0) return `${absolute} (today)`;
  return `${absolute} (${days} day${days === 1 ? '' : 's'} ago)`;
}

export function MovementHeatmapCell({ config }: { config: EntityWidgetConfig }) {
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const timeWindow = useDashboardTimeWindow();
  const shown = entities.slice(0, MAX_SERIES);
  const window = useMemo(
    () => resolveHistoryWindow(timeWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeWindow],
  );
  // Raw, unaggregated: averaging coordinates would place the sensor where it never was.
  const history = useRawHistoryForEntities(shown, entityType, ['latitude', 'longitude'], window);
  // Latest position carries no time bound, so it answers the question the history can't when
  // the window comes back empty: does this entity report location at all, and how long ago?
  const latest = useMultiKeyLatestForEntities(shown, entityType, ['latitude', 'longitude']);

  // pairCoordinates sorts up to RAW_POINT_LIMIT (5,000) points per key per entity — worth
  // memoizing so an unrelated re-render (e.g. a sibling widget's poll tick) doesn't re-sort
  // and re-walk the whole trail, which also feeds MovementHeatmapWidget's effect and would
  // otherwise tear down and rebuild the Leaflet heat layer on every such render too.
  const points = useMemo(
    () =>
      shown.flatMap((entity) => {
        const series = history.byEntity[entity.id] ?? {};
        return pairCoordinates(series.latitude ?? [], series.longitude ?? []);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, history.byEntity],
  );

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;

  // "Nothing to draw" has several causes with different fixes, so the widget names the one it
  // hit instead of leaving the user to guess which.
  let emptyReason: string | undefined;
  if (!history.isLoading && points.length === 0) {
    const rawCounts = shown.reduce(
      (acc, e) => {
        const series = history.byEntity[e.id] ?? {};
        return {
          lat: acc.lat + (series.latitude?.length ?? 0),
          lng: acc.lng + (series.longitude?.length ?? 0),
        };
      },
      { lat: 0, lng: 0 },
    );

    if (rawCounts.lat > 0 && rawCounts.lng > 0) {
      emptyReason = 'Latitude and longitude were reported but never within 10s of each other';
    } else if (rawCounts.lat > 0 || rawCounts.lng > 0) {
      emptyReason = `Only ${rawCounts.lat === 0 ? 'longitude' : 'latitude'} was reported — a position needs both`;
    } else {
      // Nothing in the window. The latest reading tells us whether that's "never reports
      // location" or "reports it, just not lately" — a completely different fix for the user.
      const lastTs = shown.reduce((newest, e) => {
        const readings = latest.byEntity[e.id] ?? {};
        return Math.max(newest, readings.latitude?.ts ?? 0, readings.longitude?.ts ?? 0);
      }, 0);

      if (lastTs === 0) {
        emptyReason = 'This entity has never reported latitude/longitude';
      } else if (lastTs > window.endTs) {
        // A reading stamped ahead of the window's end can never be reached by widening the range
        // backwards, which is what the generic "widen the time range" advice would wrongly
        // suggest. Usually a device clock that's wrong.
        emptyReason = `Position data is stamped ${formatFix(lastTs)}, after this window ends — check the device clock.`;
      } else {
        emptyReason = `No position in this window. Last fix was ${formatFix(lastTs)}; widen the range past that to see it.`;
      }
    }
  }

  return (
    <MovementHeatmapWidget
      title={config.title}
      points={points}
      emptyReason={emptyReason}
      isLoading={history.isLoading}
    />
  );
}

export function MapCell({ config }: { config: EntityWidgetConfig }) {
  const entityType = config.entityType ?? 'DEVICE';
  // A legacy config saved before entityScope existed is `{}` — no id and no scope — and has
  // always meant the fleet map, so anything without an explicit entityId renders as fleet.
  const single = Boolean(config.entityId) && !isAllScope(config);

  const { entities, notFound } = useDatasourceEntities(single ? config : {});
  const location = useTelemetryLatest(single ? (config.entityId ?? '') : '', entityType, ['latitude', 'longitude']);

  if (!single) {
    return <FleetMapWidget heightClassName="h-full" entityType={entityType} refetchInterval={ENTITY_POLL_MS} />;
  }
  if (notFound) return <WidgetUnavailable />;
  if (location.isLoading) return <WidgetUnavailable reason="Loading location…" />;

  const lat = location.data?.latitude ? Number(location.data.latitude.value) : undefined;
  const lng = location.data?.longitude ? Number(location.data.longitude.value) : undefined;
  if (lat === undefined || lng === undefined) return <WidgetUnavailable reason="No location data reported for this entity" />;

  return (
    <MapWidget
      id={config.entityId as string}
      type={entityType}
      name={entities[0]?.name ?? 'Entity'}
      lat={lat}
      lng={lng}
      heightClassName="h-full"
    />
  );
}
