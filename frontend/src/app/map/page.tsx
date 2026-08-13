'use client';

import dynamic from 'next/dynamic';

// Leaflet touches `window` at module scope, so this widget must never load during SSR.
const FleetMapWidget = dynamic(() => import('@/widgets/maps').then((m) => m.FleetMapWidget), { ssr: false });

export default function MapPage() {
  return (
    <div className="h-full w-full">
      <FleetMapWidget heightClassName="h-full" />
    </div>
  );
}
