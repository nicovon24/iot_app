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
import { useDeleteCustomer } from '@/hooks';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';
import { ConfirmDialog } from '@/widgets';
import { TableRowsSkeleton } from '@/components';
import { Tooltip } from '@/components';
import { tableClassNames, toastError, toastSuccess } from '@/lib';
import type { EntityRef } from '@/types';

const TABLE_CLASSNAMES = tableClassNames({ align: 'left', interactive: true });

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
    <div className="glass-card flex h-96 shrink-0 flex-col gap-3 p-4 md:h-full md:min-h-0 md:w-full">
      <div className="flex items-center justify-between">
        <h2 className="t-heading">Clients</h2>
        {!readOnly && (
          <button
            type="button"
            onClick={onAddClient}
            className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            <Plus size={12} /> Add
          </button>
        )}
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
                  className={`group cursor-pointer ${selectedCustomerId === customer.id ? 'bg-tint-strong' : ''}`}
                >
                  <TableCell className="font-medium text-heading" onClick={() => onSelect(customer)}>
                    {customer.name}
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <div className="flex justify-end">
                        <Tooltip label="Delete">
                          <button
                            type="button"
                            onClick={() => setPendingDelete(customer)}
                            className="rounded p-1 text-danger hover:bg-tint"
                            aria-label="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    )}
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
