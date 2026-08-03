'use client';

import { useRouter } from 'next/navigation';
import { useEntities } from '@/hooks/useEntities';
import { EntityListWidget } from '@/widgets/EntityListWidget';

export default function AssetsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useEntities('ASSET');

  return (
    <div className="h-full w-full">
      <EntityListWidget
        data={data}
        isLoading={isLoading}
        isError={isError}
        error={error}
        emptyLabel="No assets found"
        onRowClick={(entity) => router.push(`/entities/${entity.id}?type=${entity.type}`)}
      />
    </div>
  );
}
