'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tab, Tabs } from '@heroui/react';
import { apiClient } from '@/lib/api-client';
import { useEntityAttributes } from '@/hooks/entities/useEntityAttributes';
import { useTelemetryKeys, useTelemetryHistory, useTelemetryLatest } from '@/hooks/entities/useEntityTelemetry';
import { useLiveTelemetry } from '@/hooks/entities/useLiveTelemetry';
import { useEntityAlarms } from '@/hooks/entities/useEntityAlarms';
import { useLiveAlarms } from '@/hooks/entities/useLiveAlarms';
import { AttributesTableWidget } from '@/widgets/entity/AttributesTableWidget';
import { ValueTileWidget } from '@/widgets/charts/ValueTileWidget';
import { LineChartWidget } from '@/widgets/charts/LineChartWidget';
import { AlarmsListWidget } from '@/widgets/entity/AlarmsListWidget';
import { MapWidget } from '@/widgets/maps/MapWidget';
import type { Alarm, EntityRef, EntityType } from '@/types';

const ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];
const LIST_PATH: Record<'DEVICE' | 'ASSET', string> = { DEVICE: 'devices', ASSET: 'assets' };

const TABS_CLASSNAMES = {
  tabList: 'gap-6 border-b border-border bg-transparent p-0',
  cursor: 'bg-[linear-gradient(135deg,var(--gradient-accent-from),var(--gradient-accent-to))]',
  tab: 'h-auto px-1 py-3',
  tabContent: 'text-muted font-medium group-data-[selected=true]:text-accent group-data-[selected=true]:font-semibold',
  panel: 'pt-4 animate-fade-up',
};

function parseType(raw: string | null): EntityType {
  return raw && (ENTITY_TYPES as string[]).includes(raw) ? (raw as EntityType) : 'DEVICE';
}

export default function EntityDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const type = parseType(searchParams.get('type'));

  const { data: entity } = useQuery({
    queryKey: ['entity', id, type],
    queryFn: () =>
      apiClient.get<EntityRef>(`/${LIST_PATH[type as 'DEVICE' | 'ASSET'] ?? 'devices'}/${id}`),
  });

  const attributesQuery = useEntityAttributes(id, type);
  const keysQuery = useTelemetryKeys(id, type);

  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedKey && keysQuery.data && keysQuery.data.length > 0) {
      setSelectedKey(keysQuery.data[0]);
    }
  }, [keysQuery.data, selectedKey]);

  const latestQuery = useTelemetryLatest(id, type, selectedKey ? [selectedKey] : undefined);
  const historyQuery = useTelemetryHistory(id, type, selectedKey);

  const [liveValue, setLiveValue] = useState<{ value: string; ts: number } | undefined>(undefined);

  useEffect(() => {
    setLiveValue(undefined);
  }, [selectedKey]);

  useEffect(() => {
    if (selectedKey && latestQuery.data?.[selectedKey]) {
      setLiveValue(latestQuery.data[selectedKey]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, latestQuery.data]);

  const subscribeTarget = useMemo(() => ({ entityId: id, entityType: type }), [id, type]);

  useLiveTelemetry(subscribeTarget, (frame) => {
    if (frame.event !== 'telemetry' || !selectedKey) return;
    const tuples = frame.data[selectedKey];
    if (!tuples || tuples.length === 0) return;
    const [ts, value] = tuples[tuples.length - 1];
    setLiveValue({ value, ts });
  });

  const chartData = useMemo(
    () => (historyQuery.data ?? []).map((point) => ({ ts: point.ts, value: Number(point.value) })),
    [historyQuery.data],
  );

  const alarmsQuery = useEntityAlarms(id, type);
  const [liveAlarms, setLiveAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    setLiveAlarms([]);
  }, [id]);

  useLiveAlarms(subscribeTarget, (alarm) => {
    setLiveAlarms((prev) => [alarm, ...prev]);
  });

  const alarmRows = useMemo(() => {
    const base = alarmsQuery.data?.data ?? [];
    const baseIds = new Set(base.map((a) => `${a.id.id}-${a.startTs}`));
    const newOnes = liveAlarms.filter((a) => !baseIds.has(`${a.id.id}-${a.startTs}`));
    return [...newOnes, ...base];
  }, [alarmsQuery.data, liveAlarms]);

  const hasLocation = (keysQuery.data ?? []).includes('latitude') && (keysQuery.data ?? []).includes('longitude');
  const locationQuery = useTelemetryLatest(id, type, hasLocation ? ['latitude', 'longitude'] : undefined);
  const lat = locationQuery.data?.latitude ? Number(locationQuery.data.latitude.value) : undefined;
  const lng = locationQuery.data?.longitude ? Number(locationQuery.data.longitude.value) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-heading">
        {entity?.name ?? 'Loading…'}
        {entity && <span className="ml-2 text-sm font-normal text-muted">{entity.type}</span>}
      </h1>

      <Tabs aria-label="Entity detail tabs" variant="underlined" classNames={TABS_CLASSNAMES}>
        <Tab key="telemetry" title="Telemetry">
          <div className="flex flex-col gap-4">
            <div className="flex max-w-xs flex-col gap-1.5">
              <label htmlFor="telemetry-key" className="text-sm font-medium text-body">
                Telemetry key
              </label>
              <select
                id="telemetry-key"
                value={selectedKey ?? ''}
                onChange={(e) => setSelectedKey(e.target.value || undefined)}
                disabled={keysQuery.isLoading || (keysQuery.data?.length ?? 0) === 0}
                className="w-full rounded-md border border-border bg-white/5 px-3 py-2.5 text-sm text-heading focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
              >
                {(keysQuery.data ?? []).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>

            {selectedKey && (
              <>
                <ValueTileWidget label={selectedKey} value={liveValue?.value} ts={liveValue?.ts} />
                <LineChartWidget data={chartData} dataKey={selectedKey} />
              </>
            )}
          </div>
        </Tab>

        <Tab key="attributes" title="Attributes">
          <AttributesTableWidget
            data={attributesQuery.data}
            isLoading={attributesQuery.isLoading}
            isError={attributesQuery.isError}
            error={attributesQuery.error}
          />
        </Tab>

        <Tab key="alarms" title="Alarms">
          <AlarmsListWidget
            alarms={alarmRows}
            isLoading={alarmsQuery.isLoading}
            isError={alarmsQuery.isError}
            error={alarmsQuery.error}
            emptyLabel="No alarms for this entity"
          />
        </Tab>

        <Tab key="map" title="Map" isDisabled={!hasLocation}>
          {hasLocation && lat !== undefined && lng !== undefined ? (
            <MapWidget id={id} type={type} name={entity?.name ?? 'Entity'} lat={lat} lng={lng} />
          ) : (
            <p className="text-sm text-muted">No location data reported by this entity.</p>
          )}
        </Tab>
      </Tabs>
    </div>
  );
}
