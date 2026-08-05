import { FleetMapWidget } from '@/widgets/maps/FleetMapWidget';

export default function MapPage() {
  return (
    <div className="h-full w-full">
      <FleetMapWidget heightClassName="h-full" />
    </div>
  );
}
