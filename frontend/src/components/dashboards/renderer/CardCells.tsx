'use client';

import { ValueTileWidget } from '@/widgets';
import { MultiValueTileWidget } from '@/widgets';
import { ValueCardsWidget } from '@/widgets';
import { GaugeWidget } from '@/widgets';
import { BatteryWidget } from '@/widgets';
import { RssiWidget } from '@/widgets';
import { LabelWidget } from '@/widgets';
import { useWidgetAction } from '../widget-config/widget-actions';
import {
  isAllScope,
  resolveHistoryWindow,
  useDatasourceEntities,
  useHistoryForEntities,
  useLatestForEntities,
  useMultiKeyLatestForEntities,
} from '../use-widget-datasource';
import { MAX_CARDS, MAX_TILES, WidgetUnavailable, type EntityWidgetConfig } from './shared';

/** Fixed lookback for the sparkline trend line — independent of the dashboard's own time window,
 * which can span months and would be pointless resolution for a tile-sized trend indicator. */
const SPARKLINE_WINDOW_MS = 3 * 3_600_000;

export function ValueTileCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);
  const onEntityClick = useWidgetAction(config);

  const shown = all ? entities.slice(0, MAX_TILES) : entities;
  const latest = useLatestForEntities(shown, entityType, config.telemetryKey);

  // Sparkline is SINGLE-scope only (config-panel gates it, but a stray ALL-scope config with the
  // flag set must not fan out into up to MAX_TILES history requests) — hooks still run
  // unconditionally, varying the entity list instead of the hook call itself.
  const wantsSparkline = !all && Boolean(config.sparkline);
  const sparklineWindow = resolveHistoryWindow({ kind: 'LAST', ms: SPARKLINE_WINDOW_MS });
  const history = useHistoryForEntities(
    wantsSparkline ? entities : [],
    entityType,
    config.telemetryKey,
    sparklineWindow,
    {},
  );

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
  const sparklineData =
    wantsSparkline && entity
      ? (history.byEntity[entity.id] ?? []).map((v) => ({ ts: v.ts, value: Number(v.value) })).filter((p) => Number.isFinite(p.value))
      : undefined;
  return (
    <ValueTileWidget
      label={config.title ?? `${entity?.name ?? ''} · ${config.telemetryKey}`}
      value={point?.value}
      unit={config.unit}
      ts={point?.ts}
      sparklineData={sparklineData}
    />
  );
}

export function ValueCardsCell({ config }: { config: EntityWidgetConfig }) {
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
      units={config.units}
    />
  );
}

export function GaugeCell({ config }: { config: EntityWidgetConfig }) {
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
      style={config.style}
    />
  );
}

/** Per-unit defaults for the dial widgets, applied when the config leaves the scale blank.
 * A battery is always 0-100 %; RSSI's usable band is roughly -120 dBm (no signal) to -30 (next
 * to the antenna). Guessing a range from the value, as the gauge does, would make a -70 dBm
 * reading look full-scale. */
const DIAL_DEFAULTS = {
  battery: { min: 0, max: 100, unit: '%' },
  rssi: { min: -120, max: -30, unit: 'dBm' },
} as const;

export function DialCell({ config, kind }: { config: EntityWidgetConfig; kind: 'battery' | 'rssi' }) {
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);
  // One dial shows one subject, so only the first entity is fetched — same reason GaugeCell
  // renders entities[0], but narrowed at the query so a stray ALL-scope config doesn't fan out.
  const shown = entities.slice(0, 1);
  const latest = useLatestForEntities(shown, entityType, config.telemetryKey);

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;

  const defaults = DIAL_DEFAULTS[kind];
  const entity = shown[0];
  const point = entity ? latest.byEntity[entity.id] : undefined;
  const numeric = point?.value !== undefined ? Number(point.value) : undefined;
  const props = {
    label: config.title ?? `${entity?.name ?? ''} · ${config.telemetryKey ?? ''}`,
    value: numeric,
    min: config.min ?? defaults.min,
    max: config.max ?? defaults.max,
    unit: config.unit ?? defaults.unit,
    ts: point?.ts,
  };

  return kind === 'battery' ? <BatteryWidget {...props} /> : <RssiWidget {...props} />;
}

/** No datasource hooks at all — the simplest cell in the codebase, by design. */
export function LabelCell({ config }: { config: EntityWidgetConfig }) {
  return <LabelWidget text={config.text ?? ''} align={config.align} />;
}
