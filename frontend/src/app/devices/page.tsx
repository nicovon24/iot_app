'use client';

import { useRouter } from 'next/navigation';
import { useEntities } from '@/hooks';
import { usePatchDevice } from '@/hooks';
import { usePermissions } from '@/hooks';
import { EntityListWidget } from '@/widgets';
import { PageHeader, StatusPill } from '@/components';
import { toastError } from '@/lib';

export default function DevicesPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useEntities('DEVICE');
  const patchDevice = usePatchDevice();
  const { canWrite } = usePermissions();

  const total = data?.totalElements ?? 0;

  return (
    <div className="flex h-full w-full flex-col">
      <PageHeader
        title="Devices"
        description={
          <>
            {total} {total === 1 ? 'device' : 'devices'} registered. Click a row to open its detail.
          </>
        }
        actions={!isLoading && !isError ? <StatusPill label={`${total} online`} /> : undefined}
      />

      <div className="rule-2 mt-[30px] min-h-0 flex-1 pt-0">
        <EntityListWidget
          data={data}
          isLoading={isLoading}
          isError={isError}
          error={error}
          emptyLabel="No devices found"
          onRowClick={(entity) => router.push(`/entities/${entity.id}?type=${entity.type}`)}
          editableFields={['label']}
          readOnly={!canWrite}
          editTitle="Edit Device"
          isEditPending={patchDevice.isPending}
          editError={patchDevice.error}
          onEditSave={(entity, values) =>
            patchDevice.mutate(
              { id: entity.id, dto: { label: values.label ?? '' } },
              { onError: (error) => toastError("Couldn't update Device", error) },
            )
          }
        />
      </div>
    </div>
  );
}
