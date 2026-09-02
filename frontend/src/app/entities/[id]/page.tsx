'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tab, Tabs } from '@heroui/react';
import { Select } from '@/components';
import { apiClient, suggestUnit } from '@/lib';
import { useEntityAttributes } from '@/hooks';
import { useTelemetryKeys, useTelemetryHistory, useTelemetryLatest } from '@/hooks';
import { useLiveTelemetry } from '@/hooks';
import { useEntityAlarms } from '@/hooks';
import { useLiveAlarms } from '@/hooks';
import { AttributesTableWidget } from '@/widgets';
import { ValueTileWidget } from '@/widgets';
import { LineChartWidget } from '@/widgets';
import { AlarmsListWidget } from '@/widgets';
import type { Alarm, EntityRef, EntityType } from '@/types';

// Leaflet touches `window` at module scope, so this widget must never load during SSR.
const MapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.MapWidget), { ssr: false });

const ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];
const LIST_PATH: Record<'DEVICE' | 'ASSET', string> = { DEVICE: 'devices', ASSET: 'assets' };

const TABS_CLASSNAMES = {
  tabList: 'gap-6 border-b border-border bg-transparent p-0',
  cursor: 'bg-[linear-gradient(135deg,var(--gradient-accent-from),var(--gradient-accent-to))]',
  tab: 'h-auto px-1 py-3',
  tabContent:
    'text-muted font-medium group-data-[selected=true]:text-accent group-data-[selected=true]:font-semibold',
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
      // Auto-selects the first telemetry key once the list loads, if the user hasn't picked one.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedKey(keysQuery.data[0]);
    }
  }, [keysQuery.data, selectedKey]);

  const latestQuery = useTelemetryLatest(id, type, selectedKey ? [selectedKey] : undefined);
  const historyQuery = useTelemetryHistory(id, type, selectedKey);

  const [liveValue, setLiveValue] = useState<{ value: string; ts: number } | undefined>(undefined);

  useEffect(() => {
    // Clears the stale value from the previous key while the new key's query is loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveValue(undefined);
  }, [selectedKey]);

  useEffect(() => {
    if (selectedKey && latestQuery.data?.[selectedKey]) {
      // Seeds from the latest REST snapshot; live WS frames (below) take over from there.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLiveValue(latestQuery.data[selectedKey]);
    }
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
  const selectedUnit = selectedKey ? suggestUnit(selectedKey) : undefined;

  const alarmsQuery = useEntityAlarms(id, type);
  const [liveAlarms, setLiveAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    // Clears alarms from the previous entity while the new entity's subscription spins up.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const hasLocation =
    (keysQuery.data ?? []).includes('latitude') && (keysQuery.data ?? []).includes('longitude');
  const locationQuery = useTelemetryLatest(
    id,
    type,
    hasLocation ? ['latitude', 'longitude'] : undefined,
  );
  const lat = locationQuery.data?.latitude ? Number(locationQuery.data.latitude.value) : undefined;
  const lng = locationQuery.data?.longitude
    ? Number(locationQuery.data.longitude.value)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-title">
        {entity?.name ?? 'Loading…'}
        {entity && <span className="ml-2 t-label align-middle">{entity.type}</span>}
      </h1>

      <Tabs aria-label="Entity detail tabs" variant="underlined" classNames={TABS_CLASSNAMES}>
        <Tab key="telemetry" title="Telemetry">
          <div className="flex flex-col gap-4">
            <div className="max-w-xs">
              <Select
                label="Telemetry key"
                value={selectedKey ?? ''}
                onChange={(v) => setSelectedKey(v || undefined)}
                disabled={keysQuery.isLoading || (keysQuery.data?.length ?? 0) === 0}
                options={(keysQuery.data ?? []).map((key) => ({ value: key, label: key }))}
              />
            </div>

            {selectedKey && (
              <>
                <ValueTileWidget
                  label={selectedKey}
                  value={liveValue?.value}
                  ts={liveValue?.ts}
                  unit={selectedUnit}
                />
                <LineChartWidget data={chartData} dataKey={selectedKey} unit={selectedUnit} />
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
