'use client';

import { useMemo } from 'react';
import { useTelemetryLatest } from '@/hooks/useEntityTelemetry';
import { useEntityAlarms, useGlobalAlarms } from '@/hooks/useEntityAlarms';
import { MAX_SERIES } from '@/lib/chart-palette';
import { ValueTileWidget } from '@/widgets/charts/ValueTileWidget';
import { MultiValueTileWidget } from '@/widgets/charts/MultiValueTileWidget';
import { ValueCardsWidget } from '@/widgets/charts/ValueCardsWidget';
import { GaugeWidget } from '@/widgets/charts/GaugeWidget';
import { LineChartWidget } from '@/widgets/charts/LineChartWidget';
import { MultiSeriesLineChartWidget } from '@/widgets/charts/MultiSeriesLineChartWidget';
import { EntityDataTableWidget } from '@/widgets/entity/EntityDataTableWidget';
import { AlarmsListWidget } from '@/widgets/entity/AlarmsListWidget';
import { useWidgetAction, type WidgetAction } from './widget-actions';
import { MapWidget } from '@/widgets/maps/MapWidget';
import { FleetMapWidget } from '@/widgets/maps/FleetMapWidget';
import { useDashboardTimeWindow } from './TimeWindowPicker';
import {
  resolveHistoryWindow,
  isAllScope,
  useDatasourceEntities,
  useEntityTableData,
  useHistoryForEntities,
  useLatestForEntities,
  useMultiKeyLatestForEntities,
  type DataKey,
  type WidgetDatasource,
} from './use-widget-datasource';
import type { DashboardWidget } from '@/types';

/**
 * Per-widget caps on how many entities an ALL-scope widget actually renders.
 *
 * The line chart's cap is a hard design constraint, not a performance guess: the categorical
 * palette is eight validated slots and a ninth series would have to invent a hue or reuse one,
 * either of which breaks colorblind separation. The tile/row caps are about request volume —
 * each entity costs its own telemetry/attribute request — and about the display staying
 * readable. In every case the widget reports how many entities it left out rather than
 * silently truncating.
 */
const MAX_TILES = 24;
const MAX_ROWS = 20;
const MAX_CARDS = 24;

const ENTITY_POLL_MS = 60_000;

function WidgetUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="glass-card flex h-full min-h-24 items-center justify-center p-4 text-center">
      <p className="text-sm text-muted">{reason ?? 'Entity unavailable — it may have been deleted'}</p>
    </div>
  );
}

interface EntityWidgetConfig extends WidgetDatasource {
  telemetryKey?: string;
  agg?: 'AVG' | 'MIN' | 'MAX' | 'SUM' | 'COUNT';
  interval?: number;
  /** Value Cards — the measures shown on every card. */
  telemetryKeys?: string[];
  /** Gauge — dial calibration. */
  min?: number;
  max?: number;
  unit?: string;
  /** Table widgets only — which attribute/telemetry keys become columns. */
  dataKeys?: DataKey[];
  /** Overrides the title each cell would otherwise generate from entity + key. */
  title?: string;
  action?: WidgetAction;
}

export function DashboardWidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const config = widget.config as EntityWidgetConfig;

  switch (widget.widgetType) {
    case 'value-tile':
      return <ValueTileCell config={config} />;
    case 'value-cards':
      return <ValueCardsCell config={config} />;
    case 'gauge':
      return <GaugeCell config={config} />;
    case 'line-chart':
      return <LineChartCell config={config} />;
    case 'attributes-table':
      return <AttributesCell config={config} />;
    case 'alarms-list':
      return <AlarmsCell config={config} />;
    case 'map':
      return <MapCell config={config} />;
    default:
      return <WidgetUnavailable reason={`Unknown widget type: ${widget.widgetType}`} />;
  }
}

function ValueTileCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);
  const onEntityClick = useWidgetAction(config);

  const shown = all ? entities.slice(0, MAX_TILES) : entities;
  const latest = useLatestForEntities(shown, entityType, config.telemetryKey);

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;

  if (all) {
    return (
      <MultiValueTileWidget
        title={config.title ?? config.telemetryKey ?? 'Value'}
        entries={shown.map((e) => ({ id: e.id, name: e.name, ...latest.byEntity[e.id] }))}
        omittedCount={entities.length - shown.length}
        isLoading={latest.isLoading}
        onEntityClick={onEntityClick}
      />
    );
  }

  const entity = entities[0];
  const point = entity ? latest.byEntity[entity.id] : undefined;
  return (
    <ValueTileWidget
      label={config.title ?? `${entity?.name ?? ''} · ${config.telemetryKey}`}
      value={point?.value}
      ts={point?.ts}
    />
  );
}

function ValueCardsCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const onEntityClick = useWidgetAction(config);
  const keys = config.telemetryKeys ?? [];
  const shown = all ? entities.slice(0, MAX_CARDS) : entities;
  const latest = useMultiKeyLatestForEntities(shown, entityType, keys);

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;
  if (keys.length === 0) return <WidgetUnavailable reason="No telemetry keys selected" />;

  return (
    <ValueCardsWidget
      title={config.title}
      entries={shown.map((e) => ({
        id: e.id,
        name: e.name,
        measures: keys.map((key) => ({ key, ...latest.byEntity[e.id]?.[key] })),
      }))}
      omittedCount={entities.length - shown.length}
      isLoading={latest.isLoading}
      onEntityClick={onEntityClick}
    />
  );
}

function GaugeCell({ config }: { config: EntityWidgetConfig }) {
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);
  const latest = useLatestForEntities(entities, entityType, config.telemetryKey);

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;

  const entity = entities[0];
  const point = entity ? latest.byEntity[entity.id] : undefined;
  const numeric = point?.value !== undefined ? Number(point.value) : undefined;

  // Without a configured range, derive one around the reading so the needle still sits
  // somewhere meaningful instead of pinning at an arbitrary 0–100 end.
  const fallbackMax = numeric !== undefined && Number.isFinite(numeric) ? Math.max(1, Math.ceil(numeric * 1.5)) : 100;

  return (
    <GaugeWidget
      label={config.title ?? `${entity?.name ?? ''} · ${config.telemetryKey ?? ''}`}
      value={numeric}
      min={config.min ?? 0}
      max={config.max ?? fallbackMax}
      unit={config.unit}
      ts={point?.ts}
    />
  );
}

function LineChartCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const timeWindow = useDashboardTimeWindow();
  const shown = all ? entities.slice(0, MAX_SERIES) : entities;
  // Recomputing the window every render would make a fresh query key each time and the query
  // would never settle — same reasoning as useTelemetryHistory's own memo. Re-resolving when
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
    if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;
    return (
      <MultiSeriesLineChartWidget
        title={config.title}
        series={shown.map((e) => ({ id: e.id, name: e.name, points: multi.byEntity[e.id] ?? [] }))}
        omittedCount={entities.length - shown.length}
        isLoading={multi.isLoading}
      />
    );
  }

  // Routed through the same multi-entity hook as the ALL case (with a one-element list) rather
  // than useTelemetryHistory, whose window is hardcoded to one hour internally — a single-entity
  // chart has to honour the dashboard's window too.
  const points = entities[0] ? (single.byEntity[entities[0].id] ?? []) : [];
  const data = points.map((v) => ({ ts: v.ts, value: Number(v.value) }));
  return (
    <LineChartWidget
      data={data}
      dataKey={config.telemetryKey ?? 'value'}
      title={config.title}
      heightClassName="h-full"
    />
  );
}

function AttributesCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const onEntityClick = useWidgetAction(config);
  const shown = all ? entities.slice(0, MAX_ROWS) : entities;
  const table = useEntityTableData(shown, entityType, config.dataKeys);

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;

  return (
    <EntityDataTableWidget
      title={config.title}
      rows={shown.map((e) => ({ id: e.id, name: e.name }))}
      columns={table.columns}
      values={table.valuesByEntity}
      // One entity has room to list its keys down the page; many entities need them as columns.
      mode={all ? 'MATRIX' : 'LIST'}
      omittedCount={entities.length - shown.length}
      isLoading={table.isLoading}
      onEntityClick={onEntityClick}
    />
  );
}

function AlarmsCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const scoped = Boolean(config.entityId) && !all;

  const entityAlarms = useEntityAlarms(config.entityId ?? '', config.entityType ?? 'DEVICE');
  // ALL scope narrows the tenant-wide query to one originator kind; unscoped (legacy `{}`)
  // leaves it unfiltered, which is every alarm from devices and assets alike.
  const globalAlarms = useGlobalAlarms(all ? { entityType: config.entityType ?? 'DEVICE' } : {});
  const active = scoped ? entityAlarms : globalAlarms;

  const title = scoped
    ? 'Entity Alarms'
    : all
      ? `All ${config.entityType === 'ASSET' ? 'Asset' : 'Device'} Alarms`
      : 'All Alarms';

  return (
    <AlarmsListWidget
      alarms={active.data?.data}
      isLoading={active.isLoading}
      isError={active.isError}
      error={active.error}
      emptyLabel="No alarms"
      title={config.title ?? title}
    />
  );
}

function MapCell({ config }: { config: EntityWidgetConfig }) {
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
