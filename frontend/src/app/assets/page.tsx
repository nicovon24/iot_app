'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEntities } from '@/hooks/useEntities';
import { useDeleteAsset } from '@/hooks/useCreateAsset';
import { usePatchAsset } from '@/hooks/usePatchAsset';
import { usePermissions } from '@/hooks/useCurrentUser';
import { EntityListWidget } from '@/widgets/entity/EntityListWidget';
import { ConfirmDialog } from '@/widgets/forms/ConfirmDialog';
import { toastError } from '@/lib/toast';
import type { EntityRef } from '@/types';

export default function AssetsPage() {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<EntityRef | null>(null);
  const { data, isLoading, isError, error } = useEntities('ASSET');
  const deleteAsset = useDeleteAsset();
  const patchAsset = usePatchAsset();
  const { canWrite } = usePermissions();

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    deleteAsset.reset();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="min-h-0 flex-1">
        <EntityListWidget
          data={data}
          isLoading={isLoading}
          isError={isError}
          error={error}
          emptyLabel="No assets found"
          onRowClick={(entity) => router.push(`/entities/${entity.id}?type=${entity.type}`)}
          onDelete={(entity) => setPendingDelete(entity)}
          editableFields={['name', 'label']}
          readOnly={!canWrite}
          editTitle="Edit Asset"
          isEditPending={patchAsset.isPending}
          editError={patchAsset.error}
          onEditSave={(entity, values) =>
            patchAsset.mutate(
              { id: entity.id, dto: { name: values.name, label: values.label } },
              { onError: (error) => toastError("Couldn't update Asset", error) },
            )
          }
        />
      </div>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? 'this Asset'}?`}
        description="This permanently removes the Asset from ThingsBoard. Child Assets (if any) will lose their parent link."
        isPending={deleteAsset.isPending}
        error={deleteAsset.error}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteAsset.mutate(pendingDelete.id, { onSuccess: closeDeleteDialog });
        }}
      />
    </div>
  );
}
