'use client';

import { AlertTriangle } from 'lucide-react';
import { useEntityAlarms, useGlobalAlarms } from '@/hooks/entities/useEntityAlarms';
import { CountTileWidget } from '@/widgets/charts/CountTileWidget';
import { AlarmsListWidget } from '@/widgets/entity/AlarmsListWidget';
import { isAllScope } from '../use-widget-datasource';
import type { EntityWidgetConfig } from './shared';
import type { AlarmSeverity } from '@/types';

export function AlarmsCell({ config }: { config: EntityWidgetConfig }) {
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

/** Severities that make the tile read as "needs attention now" rather than informational. */
const URGENT_SEVERITIES: AlarmSeverity[] = ['CRITICAL', 'MAJOR'];

export function AlarmCountCell({ config }: { config: EntityWidgetConfig }) {
  const all = isAllScope(config);
  const scoped = Boolean(config.entityId) && !all;

  const entityAlarms = useEntityAlarms(config.entityId ?? '', config.entityType ?? 'DEVICE');
  const globalAlarms = useGlobalAlarms(all ? { entityType: config.entityType ?? 'DEVICE' } : {});
  const active = scoped ? entityAlarms : globalAlarms;

  // Filtering client-side rather than pushing severities/statuses to the API: the endpoint takes
  // one value per dimension, not the lists this widget configures, and the alarms are already
  // materialized in memory by the time they arrive. Counting here avoids a backend change for
  // what is a filter over an array that's already loaded.
  const severities = config.severities ?? [];
  const statuses = config.statuses ?? [];
  const alarms = (active.data?.data ?? []).filter(
    (a) =>
      (severities.length === 0 || severities.includes(a.severity)) &&
      (statuses.length === 0 || statuses.includes(a.status)),
  );

  const label =
    config.title ??
    (severities.length > 0 ? `${severities.join(', ')} alarms` : scoped ? 'Entity alarms' : 'All alarms');
  const accent = severities.some((s) => URGENT_SEVERITIES.includes(s)) || severities.length === 0 ? 'danger' : 'info';

  return (
    <CountTileWidget
      label={label}
      value={alarms.length}
      isLoading={active.isLoading}
      accent={accent}
      icon={AlertTriangle}
    />
  );
}
