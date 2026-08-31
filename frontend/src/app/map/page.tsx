'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { PageHeader, StatusPill } from '@/components';
import type { FleetEntityType } from '@/widgets/maps/fleet-positions';

// Leaflet touches `window` at module scope, so none of these may load during SSR.
const FleetMapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.FleetMapWidget), { ssr: false });
const MapDock = dynamic(() => import('@/widgets/maps').then((m) => m.MapDock), { ssr: false });
const MapStatusOverlay = dynamic(() => import('@/widgets/maps').then((m) => m.MapStatusOverlay), { ssr: false });

/**
 * Board 2a — "Instrumento".
 *
 * The map is the content here rather than a widget on a page, so it bleeds to the gutters and
 * the entity dock rides alongside it instead of below. The dock is hidden under xl: at 392px
 * it would leave the map itself unusable on a laptop, and everything in it is reachable from
 * the markers' own popups.
 *
 * Scope lives here rather than in the dock because three things answer to it — the markers on
 * the canvas, the list beside them and the counts over the corner — and a toggle that moved
 * only one of them was the bug the dock shipped with.
 */
export default function MapPage() {
  const [scope, setScope] = useState<FleetEntityType>('DEVICE');

  return (
    <div className="flex h-full w-full flex-col">
      <PageHeader
        title="Maps"
        description="Every device and asset reporting a position, clustered by proximity."
        actions={<StatusPill label="Fleet · live" />}
      />

      <div className="rule-2 -mx-10 mt-[30px] flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <FleetMapWidget entityType={scope} heightClassName="h-full" />
          <MapStatusOverlay scope={scope} />
        </div>
        <div className="hidden xl:flex">
          <MapDock scope={scope} onScopeChange={setScope} />
        </div>
      </div>
    </div>
  );
}
