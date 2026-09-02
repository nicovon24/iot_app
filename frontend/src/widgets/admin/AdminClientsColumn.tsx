'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useDeleteCustomer } from '@/hooks';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';
import { ConfirmDialog } from '@/widgets';
import { TableRowsSkeleton } from '@/components';
import { Tooltip } from '@/components';
import { MillerColumn, MillerEmpty, MillerRow } from '@/components';
import { toastError, toastSuccess } from '@/lib';
import type { EntityRef } from '@/types';

export interface AdminClientsColumnProps {
  isLoading: boolean;
  customers: EntityRef[];
  trail: EntityRef[];
  selectedCustomerId?: string;
  onSelect: (customer: EntityRef) => void;
  onNavigateTrail: (index: number) => void;
  onAddClient: () => void;
  readOnly?: boolean;
}

export function AdminClientsColumn({
  isLoading,
  customers,
  trail,
  selectedCustomerId,
  onSelect,
  onNavigateTrail,
  onAddClient,
  readOnly = false,
}: AdminClientsColumnProps) {
  const [pendingDelete, setPendingDelete] = useState<EntityRef | null>(null);
  const deleteCustomer = useDeleteCustomer();

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    deleteCustomer.reset();
  };

  return (
    <>
      <MillerColumn
        title="Clients"
        action={
          !readOnly && (
            <button
              type="button"
              onClick={onAddClient}
              className="t-action flex items-center gap-1"
            >
              <Plus size={12} /> Add
            </button>
          )
        }
      >
        <div className="px-4 pb-2">
          <AdminBreadcrumbs
            rootLabel="Root"
            trail={trail.map((c) => ({ id: c.id, name: c.name }))}
            onNavigate={onNavigateTrail}
          />
        </div>

        {isLoading && <TableRowsSkeleton rows={3} columns={2} />}

        {!isLoading && customers.length === 0 && <MillerEmpty label="No Clients here." />}

        {!isLoading &&
          customers.map((customer) => (
            <MillerRow
              key={customer.id}
              label={customer.name}
              selected={selectedCustomerId === customer.id}
              onSelect={() => onSelect(customer)}
              actions={
                !readOnly && (
                  <Tooltip label="Delete">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(customer)}
                      className="text-faint transition-colors duration-fast ease-out hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  </Tooltip>
                )
              }
            />
          ))}
      </MillerColumn>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? 'this Client'}?`}
        description="This permanently removes the Client and its hierarchy from ThingsBoard. Blocked if any Asset still belongs to it."
        isPending={deleteCustomer.isPending}
        error={deleteCustomer.error}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          if (!pendingDelete) return;
          const deletedName = pendingDelete.name;
          deleteCustomer.mutate(pendingDelete.id, {
            onSuccess: () => {
              closeDeleteDialog();
              toastSuccess('Client deleted', deletedName);
            },
            onError: (error) => toastError("Couldn't delete Client", error),
          });
        }}
      />
    </>
  );
}
