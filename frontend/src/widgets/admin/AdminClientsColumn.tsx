'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import { useDeleteCustomer } from '@/hooks/useCustomers';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';
import { ConfirmDialog } from '@/widgets/forms/ConfirmDialog';
import { TableRowsSkeleton } from '@/components/feedback/Skeleton';
import { toastError, toastSuccess } from '@/lib/toast';
import type { EntityRef } from '@/types';

const TABLE_CLASSNAMES = {
  wrapper: 'h-full rounded-none border-0 bg-transparent p-0 shadow-none overflow-y-auto',
  th: 'bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted first:rounded-none last:rounded-none border-b border-border py-3',
  td: 'text-left py-3 text-sm text-body group-data-[hover=true]:bg-surface',
  tr: 'border-b border-border last:border-b-0 cursor-pointer transition-colors',
};

export interface AdminClientsColumnProps {
  isLoading: boolean;
  customers: EntityRef[];
  trail: EntityRef[];
  selectedCustomerId?: string;
  onSelect: (customer: EntityRef) => void;
  onNavigateTrail: (index: number) => void;
  onAddClient: () => void;
}

export function AdminClientsColumn({
  isLoading,
  customers,
  trail,
  selectedCustomerId,
  onSelect,
  onNavigateTrail,
  onAddClient,
}: AdminClientsColumnProps) {
  const [pendingDelete, setPendingDelete] = useState<EntityRef | null>(null);
  const deleteCustomer = useDeleteCustomer();

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    deleteCustomer.reset();
  };

  return (
    <div className="glass-card flex h-96 shrink-0 flex-col gap-3 p-4 md:h-full md:min-h-0 md:w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-heading">Clients</h2>
        <button
          type="button"
          onClick={onAddClient}
          className="flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: 'var(--gradient-accent-from)' }}
        >
          <Plus size={12} /> Add
        </button>
      </div>

      <AdminBreadcrumbs rootLabel="Root" trail={trail.map((c) => ({ id: c.id, name: c.name }))} onNavigate={onNavigateTrail} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <TableRowsSkeleton rows={3} columns={2} />}

        {!isLoading && customers.length === 0 && (
          <div className="flex h-full min-h-32 items-center justify-center">
            <p className="text-sm text-muted">No Clients here.</p>
          </div>
        )}

        {!isLoading && customers.length > 0 && (
          <Table aria-label="Clients" classNames={TABLE_CLASSNAMES}>
            <TableHeader>
              <TableColumn>NAME</TableColumn>
              <TableColumn align="end">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody items={customers}>
              {(customer) => (
                <TableRow
                  key={customer.id}
                  className={`group cursor-pointer ${selectedCustomerId === customer.id ? 'bg-surface' : ''}`}
                >
                  <TableCell className="font-medium text-heading" onClick={() => onSelect(customer)}>
                    {customer.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPendingDelete(customer)}
                        className="rounded p-1 text-red-600 hover:bg-surface"
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
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
    </div>
  );
}
