'use client';

import { useMemo } from 'react';
import { MAX_SERIES } from '@\/lib';
import { useEntityAlarms, useGlobalAlarms } from '@/hooks';
import { useEntities } from '@/hooks';
import { LineChartWidget } from '@/widgets';
import { MultiSeriesLineChartWidget } from '@/widgets';
import { BarChartWidget } from '@/widgets';
import { MultiSeriesBarChartWidget } from '@/widgets';
import { ScatterChartWidget } from '@/widgets';
import { DonutChartWidget } from '@/widgets';
import { CalendarHeatmapWidget } from '@/widgets';
import { MultiKeyChartWidget } from '@/widgets';
import { groupKeysByUnit } from '@\/lib';
import { useDashboardTimeWindow } from '../canvas/TimeWindowPicker';
import { pairSeries } from '../datasource/pair-coordinates';
import {
  isAllScope,
  resolveHistoryWindow,
  useDatasourceEntities,
  useHistoryForEntities,
  useMultiKeyHistoryForEntities,
  useMultiKeyLatestForEntities,
} from '../use-widget-datasource';
import { MAX_TILES, WidgetUnavailable, type EntityWidgetConfig } from './shared';

export function LineChartCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const timeWindow = useDashboardTimeWindow();
  const shown = all ? entities.slice(0, MAX_SERIES) : entities;
  // Recomputing the window every render would make a fresh query key each time and the query
  // would never settle � same reasoning as useTelemetryHistory's own memo. Re-resolving when
  // the dashboard's window changes is exactly the intent, hence it being in the dep list.
  const window = useMemo(
    () => resolveHistoryWindow(timeWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.telemetryKey, timeWindow],
  );
  const multi = useHistoryForEntities(all ? shown : [], entityType, config.telemetryKey, window, {
    agg: config.agg,
    interval: config.interval,
  });
  const single = useHistoryForEntities(all ? [] : entities, entityType, config.telemetryKey, window, {
    agg: config.agg,
    interval: config.interval,
  });

  if (notFound) return <WidgetUnavailable />;

  if (all) {
    if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading�" />;
    return (
      <MultiSeriesLineChartWidget
        title={config.title}
        series={shown.map((e) => ({ id: e.id, name: e.name, points: multi.byEntity[e.id] ?? [] }))}
        omittedCount={entities.length - shown.length}
        isLoading={multi.isLoading}
        interpolation={config.interpolation}
        unit={config.unit}
      />
    );
  }

  // Routed through the same multi-entity hook as the ALL case (with a one-element list) rather
  // than useTelemetryHistory, whose window is hardcoded to one hour internally � a single-entity
  // chart has to honour the dashboard's window too.
  const points = entities[0] ? (single.byEntity[entities[0].id] ?? []) : [];
  const data = points.map((v) => ({ ts: v.ts, value: Number(v.value) }));
  return (
    <LineChartWidget
      data={data}
      dataKey={config.telemetryKey ?? 'value'}
      title={config.title}
      heightClassName="h-full"
      interpolation={config.interpolation}
      unit={config.unit}
    />
  );
}

/** Same data path as LineChartCell � only the presentation component differs. Kept as its own
 * cell rather than a `chartKind` prop on LineChartCell because the ALL-scope and single-entity
 * branches already differ per chart type, and threading a kind through both reads worse than
 * the duplication it saves. */
export function BarChartCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const timeWindow = useDashboardTimeWindow();
  const shown = all ? entities.slice(0, MAX_SERIES) : entities;
  const window = useMemo(
    () => resolveHistoryWindow(timeWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.telemetryKey, timeWindow],
  );
  const multi = useHistoryForEntities(all ? shown : [], entityType, config.telemetryKey, window, {
    agg: config.agg,
    interval: config.interval,
  });
  const single = useHistoryForEntities(all ? [] : entities, entityType, config.telemetryKey, window, {
    agg: config.agg,
    interval: config.interval,
  });

  if (notFound) return <WidgetUnavailable />;

  if (all) {
    if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading�" />;
    return (
      <MultiSeriesBarChartWidget
        title={config.title}
        series={shown.map((e) => ({ id: e.id, name: e.name, points: multi.byEntity[e.id] ?? [] }))}
        omittedCount={entities.length - shown.length}
        isLoading={multi.isLoading}
        unit={config.unit}
        stacked={config.stacked}
      />
    );
  }

  const points = entities[0] ? (single.byEntity[entities[0].id] ?? []) : [];
  const data = points.map((v) => ({ ts: v.ts, value: Number(v.value) }));
  return (
    <BarChartWidget
      data={data}
      dataKey={config.telemetryKey ?? 'value'}
      title={config.title}
      heightClassName="h-full"
      unit={config.unit}
    />
  );
}

/** Single-entity-only (supportsAllScope: false in the registry) � N entities x M keys isn't a
 * chart anyone can read, so this cell only ever fetches for the first resolved entity. */
export function MultiKeyChartCell({ config }: { config: EntityWidgetConfig }) {
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);
  const keys = config.telemetryKeys ?? [];

  const timeWindow = useDashboardTimeWindow();
  const shown = entities.slice(0, 1);
  const window = useMemo(
    () => resolveHistoryWindow(timeWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys.join(','), timeWindow],
  );
  const history = useMultiKeyHistoryForEntities(shown, entityType, keys, window, {
    agg: config.agg,
    interval: config.interval,
  });

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading�" />;
  if (keys.length < 2) return <WidgetUnavailable reason="Pick at least two telemetry keys" />;

  const entity = shown[0];
  const byKey = entity ? (history.byEntity[entity.id] ?? {}) : {};
  const { axes, omittedKeys } = groupKeysByUnit(keys, config.units);

  return (
    <MultiKeyChartWidget
      title={config.title}
      series={keys.map((key) => ({ id: key, name: key, points: byKey[key] ?? [] }))}
      axes={axes}
      omittedKeys={omittedKeys}
      isLoading={history.isLoading}
    />
  );
}

/** Axis sentinel meaning "plot the sample's timestamp on this axis" rather than a telemetry key. */
const TIME_AXIS = 'TIME';

export function ScatterCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);
  const fleetMode = config.mode === 'FLEET';

  const timeWindow = useDashboardTimeWindow();
  // Different caps because the modes colour differently: FLEET puts every entity in one series
  // (a dot each, one colour) so it's bounded by request volume, while HISTORY gives each entity
  // its own colour and is bounded by the eight validated palette slots.
  const shown = entities.slice(0, fleetMode ? MAX_TILES : MAX_SERIES);
  const window = useMemo(
    () => resolveHistoryWindow(timeWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeWindow],
  );

  const xKey = config.xKey ?? TIME_AXIS;
  const yKey = config.yKey ?? '';
  const historyKeys = [xKey, yKey].filter((k) => k && k !== TIME_AXIS);

  // FLEET plots one dot per entity from its current readings; HISTORY plots every selected
  // entity's samples across the window, one coloured series each � the same "show them all,
  // capped and labelled" rule the line and bar charts follow, rather than a picker that would
  // defeat the comparison the chart exists for. Both hooks always run (hooks can't be
  // conditional) but the inactive one is handed an empty list, so only one actually fetches.
  const history = useMultiKeyHistoryForEntities(
    fleetMode ? [] : shown,
    entityType,
    historyKeys,
    window,
    { agg: config.agg, interval: config.interval },
  );
  const latest = useMultiKeyLatestForEntities(fleetMode ? shown : [], entityType, historyKeys);

  // pairSeries sorts and walks every entity's series � expensive enough (up to MAX_SERIES
  // entities x TARGET_BUCKETS points) that it shouldn't re-run on renders the underlying data
  // didn't cause, e.g. a sibling widget's poll tick re-rendering this one along with it.
  const series = useMemo(() => {
    if (fleetMode) {
      return [
        {
          id: 'fleet',
          name: 'Entities',
          points: shown.flatMap((entity) => {
            const readings = latest.byEntity[entity.id] ?? {};
            const x = xKey === TIME_AXIS ? readings[yKey]?.ts : Number(readings[xKey]?.value);
            const y = Number(readings[yKey]?.value);
            if (x === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return [];
            return [{ x, y, label: entity.name }];
          }),
        },
      ];
    }
    return shown.map((entity) => {
      const byKey = history.byEntity[entity.id] ?? {};
      const ySeries = byKey[yKey] ?? [];
      if (xKey === TIME_AXIS) {
        return {
          id: entity.id,
          name: entity.name,
          points: ySeries.flatMap((point) => {
            const y = Number(point.value);
            return Number.isFinite(y) ? [{ x: point.ts, y }] : [];
          }),
        };
      }
      // Two keys against each other: a dot exists only where both were sampled at about the
      // same moment. Joined with the shared tolerant pairing rather than on exact timestamps �
      // ThingsBoard stamps each key as it writes it, so equal-timestamp matching finds nothing
      // even when the device sent both in one payload.
      return {
        id: entity.id,
        name: entity.name,
        points: pairSeries(byKey[xKey] ?? [], ySeries).map(({ a, b }) => ({ x: a, y: b })),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleetMode, shown, history.byEntity, latest.byEntity, xKey, yKey]);

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading�" />;
  if (!config.yKey) return <WidgetUnavailable reason="Pick the two keys to plot against each other" />;

  return (
    <ScatterChartWidget
      title={config.title}
      series={series}
      xLabel={xKey === TIME_AXIS ? 'Time' : xKey}
      yLabel={yKey}
      xIsTime={xKey === TIME_AXIS}
      xUnit={config.xUnit}
      yUnit={config.yUnit}
      // Reported in both modes now that HISTORY plots every selected entity too � silently
      // dropping the 9th sensor would misrepresent the comparison.
      omittedCount={entities.length - shown.length}
      isLoading={fleetMode ? latest.isLoading : history.isLoading}
    />
  );
}

/** Severity keeps its established colours � the same red/amber the alarm chips use, so a slice
 * means the same thing here as everywhere else in the app. */
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  MAJOR: '#f87171',
  WARNING: '#f59e0b',
  MINOR: '#fbbf24',
  INDETERMINATE: '#94a3b8',
};

export function DonutCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const scoped = Boolean(config.entityId) && !all;
  const groupBy = config.groupBy ?? 'ALARM_SEVERITY';
  const countsEntities = groupBy === 'ENTITY_TYPE';

  // Donut's entity is optional (whole tenant by default), but when the user did pin one, its
  // alarms have to come from the entity-scoped endpoint � the global one has no entityId filter
  // and would otherwise silently render tenant-wide counts under a title that names one device.
  const entityAlarms = useEntityAlarms(config.entityId ?? '', config.entityType ?? 'DEVICE');
  const globalAlarms = useGlobalAlarms(
    countsEntities || scoped ? {} : all ? { entityType: config.entityType ?? 'DEVICE' } : {},
  );
  const activeAlarms = scoped && !countsEntities ? entityAlarms : globalAlarms;
  const devices = useEntities('DEVICE', { pageSize: 200 }, { enabled: countsEntities });
  const assets = useEntities('ASSET', { pageSize: 200 }, { enabled: countsEntities });

  if (countsEntities) {
    const slices = [
      { name: 'Devices', value: devices.data?.totalElements ?? devices.data?.data.length ?? 0 },
      { name: 'Assets', value: assets.data?.totalElements ?? assets.data?.data.length ?? 0 },
    ].filter((s) => s.value > 0);

    return (
      <DonutChartWidget
        title={config.title ?? 'Entities'}
        slices={slices}
        unitNoun="entities"
        isLoading={devices.isLoading || assets.isLoading}
      />
    );
  }

  const alarms = activeAlarms.data?.data ?? [];
  const field = groupBy === 'ALARM_SEVERITY' ? 'severity' : 'status';
  const counts = new Map<string, number>();
  for (const alarm of alarms) {
    const key = String(alarm[field]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const slices = Array.from(counts, ([name, value]) => ({
    name,
    value,
    color: groupBy === 'ALARM_SEVERITY' ? SEVERITY_COLORS[name] : undefined,
  })).sort((a, b) => b.value - a.value);

  return (
    <DonutChartWidget
      title={config.title ?? (groupBy === 'ALARM_SEVERITY' ? 'Alarms by severity' : 'Alarms by status')}
      slices={slices}
      unitNoun="alarms"
      isLoading={activeAlarms.isLoading}
    />
  );
}

const DAY_MS = 86_400_000;

export function CalendarHeatmapCell({ config }: { config: EntityWidgetConfig }) {
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const timeWindow = useDashboardTimeWindow();
  const shown = entities.slice(0, 1);
  // One bucket per day is the widget's premise, not a setting � a calendar cell *is* a day.
  const window = useMemo(
    () => resolveHistoryWindow(timeWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.telemetryKey, timeWindow],
  );
  const history = useHistoryForEntities(shown, entityType, config.telemetryKey, window, {
    agg: config.agg,
    interval: DAY_MS,
  });

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading�" />;

  const entity = shown[0];
  const points = (entity ? (history.byEntity[entity.id] ?? []) : [])
    .map((v) => ({ ts: v.ts, value: Number(v.value) }))
    .filter((p) => Number.isFinite(p.value));

  return (
    <CalendarHeatmapWidget
      title={config.title ?? `${entity?.name ?? ''} � ${config.telemetryKey ?? ''}`}
      points={points}
      unit={config.unit}
      window={window}
      isLoading={history.isLoading}
    />
  );
}
