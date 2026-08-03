'use client';

import { useRouter } from 'next/navigation';
import { useEntities } from '@/hooks/useEntities';
import { EntityListWidget } from '@/widgets/EntityListWidget';

export default function DevicesPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useEntities('DEVICE');

  return (
    <div className="h-full w-full">
      <EntityListWidget
        data={data}
        isLoading={isLoading}
        isError={isError}
        error={error}
        emptyLabel="No devices found"
        onRowClick={(entity) => router.push(`/entities/${entity.id}?type=${entity.type}`)}
      />
    </div>
  );
}
