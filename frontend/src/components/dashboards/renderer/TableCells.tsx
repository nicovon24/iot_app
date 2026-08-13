'use client';

import { useMemo } from 'react';
import { EntityDataTableWidget } from '@/widgets';
import { TimeseriesTableWidget } from '@/widgets';
import { useWidgetAction } from '../widget-config/widget-actions';
import { useDashboardTimeWindow } from '../canvas/TimeWindowPicker';
import {
  isAllScope,
  resolveHistoryWindow,
  useDatasourceEntities,
  useEntityTableData,
  useMultiKeyHistoryForEntities,
} from '../use-widget-datasource';
import { MAX_ROWS, WidgetUnavailable, type EntityWidgetConfig } from './shared';

export function TimeseriesTableCell({ config }: { config: EntityWidgetConfig }) {
  const entityType = config.entityType ?? 'DEVICE';
  const { entities, isLoading, notFound } = useDatasourceEntities(config);

  const timeWindow = useDashboardTimeWindow();
  const keys = config.telemetryKeys ?? [];
  // Same memoization requirement as the charts: a rolling window recomputed every render makes
  // a new query key every render and the query never settles.
  const window = useMemo(
    () => resolveHistoryWindow(timeWindow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeWindow],
  );
  // Only the first entity is rendered (rows are timestamps, so a second entity has nowhere to
  // go), and the fetch is narrowed to match — an ALL-scope config reaching here through an old
  // save would otherwise fan out one request per device and display one of them.
  const shown = entities.slice(0, 1);
  const history = useMultiKeyHistoryForEntities(shown, entityType, keys, window, {
    agg: config.agg,
    interval: config.interval,
  });

  if (notFound) return <WidgetUnavailable />;
  if (isLoading && entities.length === 0) return <WidgetUnavailable reason="Loading…" />;

  const entity = shown[0];
  return (
    <TimeseriesTableWidget
      title={config.title}
      keys={keys}
      byKey={entity ? (history.byEntity[entity.id] ?? {}) : {}}
      isLoading={history.isLoading}
      units={config.units}
    />
  );
}

export function AttributesCell({ config }: { config: EntityWidgetConfig }) {
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
