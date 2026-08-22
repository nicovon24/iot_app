'use client';

import { useState } from 'react';
import { useCustomers, useDeleteCustomer, usePatchCustomer } from '@/hooks';
import { usePermissions } from '@/hooks';
import { EntityListWidget } from '@/widgets';
import { ConfirmDialog } from '@/widgets';
import { toastError } from '@/lib';
import type { EntityRef } from '@/types';

export default function ClientsPage() {
  const [pendingDelete, setPendingDelete] = useState<EntityRef | null>(null);
  const { data, isLoading, isError, error } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const patchCustomer = usePatchCustomer();
  const { canWrite } = usePermissions();

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    deleteCustomer.reset();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="min-h-0 flex-1">
        <EntityListWidget
          data={data}
          isLoading={isLoading}
          isError={isError}
          error={error}
          emptyLabel="No clients found"
          onDelete={(entity) => setPendingDelete(entity)}
          editableFields={['name']}
          readOnly={!canWrite}
          editTitle="Edit Client"
          isEditPending={patchCustomer.isPending}
          editError={patchCustomer.error}
          onEditSave={(entity, values) =>
            patchCustomer.mutate(
              { id: entity.id, dto: { title: values.name ?? '' } },
              { onError: (error) => toastError("Couldn't update Client", error) },
            )
          }
        />
      </div>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? 'this Client'}?`}
        description="This permanently removes the Client and its hierarchy from ThingsBoard. Blocked if any Asset still belongs to it."
        isPending={deleteCustomer.isPending}
        error={deleteCustomer.error}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteCustomer.mutate(pendingDelete.id, { onSuccess: closeDeleteDialog });
        }}
      />
    </div>
  );
}
