'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BellOff, ChevronRight, Cpu } from 'lucide-react';
import { useEntities, useGlobalAlarms, useCurrentUser } from '@/hooks';
import { PageHeader, SectionHeader, StatusPill, entityDetailsHref } from '@/components';
import { Skeleton } from '@/components';
import type { EntityRef } from '@/types';

// Leaflet touches `window` at module scope, so this widget must never load during SSR.
const FleetMapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.FleetMapWidget), {
  ssr: false,
});

/** How many device cards the summary grid shows before deferring to /devices. */
const CARD_LIMIT = 5;

/**
 * A single figure in the summary row.
 *
 * A zero reads differently from a number: it is the absence of something rather than a
 * quantity, so it drops to --color-inactive instead of shouting the same size in full
 * white. That is the whole reason the row can carry three 68px numerals without any of
 * them competing — only the ones that mean something are lit.
 */
function Kpi({ label, value, isLoading }: { label: string; value: number; isLoading?: boolean }) {
  return (
    <div>
      {isLoading ? (
        <Skeleton className="h-[68px] w-20" />
      ) : (
        <div className={`t-display ${value === 0 ? '!text-inactive' : ''}`}>{value}</div>
      )}
      <div className="t-label mt-3">{label}</div>
    </div>
  );
}

function DeviceCard({ entity }: { entity: EntityRef }) {
  return (
    <Link
      href={entityDetailsHref(entity.id, 'DEVICE')}
      className="group flex flex-col gap-3 border border-border bg-surface-card px-[18px] py-4 transition-colors duration-fast ease-out hover:border-accent-strong hover:bg-tint"
    >
      <div className="flex items-center justify-between">
        <Cpu size={17} strokeWidth={1.75} className="text-accent" />
        <span aria-hidden className="diamond h-1.5 w-1.5" />
      </div>
      <div className="t-item truncate" title={entity.name}>
        {entity.name}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-[11px]">
        <span className="t-label truncate">
          {entity.type}
          {entity.customerId?.name ? ` · ${entity.customerId.name}` : ''}
        </span>
        <ChevronRight
          size={13}
          strokeWidth={1.75}
          className="shrink-0 text-faint transition-colors duration-fast ease-out group-hover:text-accent"
        />
      </div>
    </Link>
  );
}

export default function OverviewPage() {
  const router = useRouter();
  const devicesQuery = useEntities('DEVICE');
  const assetsQuery = useEntities('ASSET');
  const alarmsQuery = useGlobalAlarms({});
  const { data: currentUser } = useCurrentUser();

  const devices = devicesQuery.data?.data ?? [];
  const assets = assetsQuery.data?.data ?? [];
  const deviceCount = devicesQuery.data?.totalElements ?? 0;
  const assetCount = assetsQuery.data?.totalElements ?? 0;

  const activeAlarms = (alarmsQuery.data?.data ?? []).filter(
    (a) => a.status === 'ACTIVE_UNACK' || a.status === 'ACTIVE_ACK',
  );

  const tenant = currentUser?.email?.split('@')[1] ?? null;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <PageHeader
        title="Overview"
        description={
          <>
            Fleet summary
            {tenant ? (
              <>
                {' '}
                for <span className="text-body">{tenant}</span>
              </>
            ) : null}{' '}
            — {deviceCount} {deviceCount === 1 ? 'device' : 'devices'} reporting, {assetCount}{' '}
            {assetCount === 1 ? 'asset' : 'assets'} registered.
          </>
        }
        actions={<StatusPill label="Live" />}
      />

      {/* The summary row. A 2px rule opens it, 1px rules divide the figures — the
       * system's two weights doing exactly the two jobs they exist for. */}
      <div className="rule-2 mt-[34px] flex shrink-0 items-stretch gap-16 pt-6">
        <Kpi label="Devices" value={deviceCount} isLoading={devicesQuery.isLoading} />
        <div aria-hidden className="w-px bg-border" />
        <Kpi label="Assets" value={assetCount} isLoading={assetsQuery.isLoading} />
        <div aria-hidden className="w-px bg-border" />
        <Kpi label="Active alarms" value={activeAlarms.length} isLoading={alarmsQuery.isLoading} />

        <button
          type="button"
          onClick={() => router.push('/alarms')}
          className="ml-auto flex items-center gap-3 self-end pb-1.5 text-left transition-colors duration-fast ease-out hover:text-heading"
        >
          <span className="badge-quiet flex h-8 w-8 shrink-0 items-center justify-center">
            <BellOff size={15} strokeWidth={1.75} />
          </span>
          <span className="text-[11px] leading-normal text-faint">
            {activeAlarms.length === 0
              ? 'No active alarms'
              : `${activeAlarms.length} active — review`}
          </span>
        </button>
      </div>

      <SectionHeader
        className="mt-[30px]"
        title="Devices"
        meta={`${deviceCount} registered`}
        action={
          <Link href="/devices" className="t-action">
            View all →
          </Link>
        }
      />

      <div className="stagger-children mt-4 grid shrink-0 grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {devicesQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[124px]" />)
        ) : devicesQuery.isError ? (
          <p className="col-span-full text-sm text-danger">
            Failed to load devices:{' '}
            {devicesQuery.error instanceof Error ? devicesQuery.error.message : 'Unknown error'}
          </p>
        ) : devices.length === 0 ? (
          <p className="col-span-full t-body">No devices registered yet.</p>
        ) : (
          <>
            {devices.slice(0, CARD_LIMIT).map((entity) => (
              <DeviceCard key={entity.id} entity={entity} />
            ))}
            {/* The assets summary rides in the grid's last cell rather than getting a
             * row of its own — dashed so it reads as a different kind of thing than
             * the solid device cards beside it. */}
            <Link
              href="/assets"
              className="flex flex-col justify-between gap-3 border border-dashed border-border px-[18px] py-4 transition-colors duration-fast ease-out hover:border-accent-strong"
            >
              <span className="t-label">
                {assetCount} {assetCount === 1 ? 'asset' : 'assets'}
              </span>
              <span className="truncate text-[12px] font-extrabold leading-tight text-nav">
                {assets.length > 0
                  ? assets
                      .slice(0, 3)
                      .map((a) => a.name)
                      .join(' · ')
                  : 'None registered'}
              </span>
            </Link>
          </>
        )}
      </div>

      {/* The map is a band, not a panel: bled to the page edges and opened by the same
       * 2px rule as the summary row, so it closes the page the way the header opens it.
       * The negative margins undo <main>'s 40px gutter. */}
      <div className="rule-2 -mx-10 mt-8 min-h-[216px] flex-1 shrink-0">
        <FleetMapWidget heightClassName="h-full min-h-[216px]" />
      </div>
    </div>
  );
}
