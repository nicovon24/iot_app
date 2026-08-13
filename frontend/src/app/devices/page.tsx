'use client';

import { useRouter } from 'next/navigation';
import { useEntities } from '@/hooks';
import { usePatchDevice } from '@/hooks';
import { usePermissions } from '@/hooks';
import { EntityListWidget } from '@/widgets';
import { toastError } from '@\/lib';

export default function DevicesPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useEntities('DEVICE');
  const patchDevice = usePatchDevice();
  const { canWrite } = usePermissions();

  return (
    <div className="h-full w-full">
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
  );
}
