'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Cpu, Box, AlertTriangle } from 'lucide-react';
import { useEntities } from '@/hooks';
import { useGlobalAlarms } from '@/hooks';
import { CountTileWidget } from '@/widgets';
import { EntityListWidget } from '@/widgets';
import { AlarmsListWidget } from '@/widgets';

// Leaflet touches `window` at module scope, so this widget must never load during SSR.
const FleetMapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.FleetMapWidget), { ssr: false });

export default function OverviewPage() {
  const router = useRouter();
  const devicesQuery = useEntities('DEVICE');
  const assetsQuery = useEntities('ASSET');
  const alarmsQuery = useGlobalAlarms({});

  const activeAlarms = (alarmsQuery.data?.data ?? []).filter(
    (a) => a.status === 'ACTIVE_UNACK' || a.status === 'ACTIVE_ACK',
  );

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="stagger-children grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <CountTileWidget label="Devices" value={devicesQuery.data?.totalElements ?? 0} isLoading={devicesQuery.isLoading} accent="info" icon={Cpu} />
        <CountTileWidget label="Assets" value={assetsQuery.data?.totalElements ?? 0} isLoading={assetsQuery.isLoading} accent="info" icon={Box} />
        <CountTileWidget label="Active Alarms" value={activeAlarms.length} isLoading={alarmsQuery.isLoading} accent="danger" icon={AlertTriangle} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-h-0 lg:col-span-2">
          <FleetMapWidget heightClassName="h-full" />
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1">
            <EntityListWidget
              data={devicesQuery.data}
              isLoading={devicesQuery.isLoading}
              isError={devicesQuery.isError}
              error={devicesQuery.error}
              emptyLabel="No devices found"
              title="Devices"
              variant="table"
              onRowClick={(entity) => router.push(`/entities/${entity.id}?type=${entity.type}`)}
            />
          </div>

          <div className="min-h-0 flex-1">
            <AlarmsListWidget
              alarms={activeAlarms}
              isLoading={alarmsQuery.isLoading}
              isError={alarmsQuery.isError}
              error={alarmsQuery.error}
              emptyLabel="No active alarms"
              title="Active Alarms"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
