'use client';

import { useState } from 'react';
import { Plus, LogIn } from 'lucide-react';
import { useCustomers } from '@/hooks';
import { useUsers, useDeleteUser } from '@/hooks';
import { useImpersonate } from '@/hooks';
import { usePermissions } from '@/hooks';
import { Select } from '@/components';
import { Tooltip } from '@/components';
import { EntityListWidget } from '@/widgets';
import { CreateUserDialog } from '@/widgets';
import { ConfirmDialog } from '@/widgets';
import type { EntityRef } from '@/types';

/** Sentinel Select value for "All Clients" (undefined `customerId`) — Radix Select needs a real string value. */
const ALL_CLIENTS = '__all__';

function roleOf(user: EntityRef): string {
  const appRole = (user.additionalInfo as { appRole?: string } | undefined)?.appRole;
  return appRole ?? 'UNKNOWN';
}

export default function UsersPage() {
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<EntityRef | null>(null);

  const { data: customers, isLoading: isCustomersLoading } = useCustomers();
  const { data: users, isLoading: isUsersLoading, isError, error } = useUsers(customerId);
  const deleteUser = useDeleteUser();
  const impersonate = useImpersonate();
  const { isSysadmin } = usePermissions();

  const customerNameById = new Map((customers?.data ?? []).map((c) => [c.id, c.name]));

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    deleteUser.reset();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {isSysadmin && (
        <div className="flex shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={!customerId}
            className="flex items-center gap-1.5 rounded-md bg-accent-strong px-3 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-40"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      <div className="w-full max-w-xs shrink-0">
        <Select
          label="Client"
          placeholder={isCustomersLoading ? 'Loading…' : undefined}
          value={customerId ?? ALL_CLIENTS}
          onChange={(value) => setCustomerId(value === ALL_CLIENTS ? undefined : value)}
          options={[
            { value: ALL_CLIENTS, label: 'All Clients' },
            ...(customers?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {/* The same component Devices and Assets render, not a lookalike — so a future change to
        * row styling lands on all three at once. Users differ only in what the generic slots
        * are fed: role instead of entity type, client name instead of customer, and an extra
        * "Login as" action alongside Delete. */}
      <div className="min-h-0 flex-1">
        <EntityListWidget
          data={users ? { data: users, totalPages: 1, totalElements: users.length, hasNext: false } : undefined}
          isLoading={isUsersLoading}
          isError={isError}
          error={error}
          emptyLabel="No users found"
          readOnly={!isSysadmin}
          subtitleOf={roleOf}
          metaOf={(user) => (user.customerId?.id ? customerNameById.get(user.customerId.id) : undefined)}
          onDelete={(user) => setPendingDelete(user)}
          extraActions={(user) => (
            <Tooltip label="Login as">
              <button
                type="button"
                onClick={() => impersonate.mutate({ id: user.id, label: user.name })}
                disabled={impersonate.isPending}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Login as ${user.name}`}
              >
                <LogIn size={14} />
              </button>
            </Tooltip>
          )}
        />
      </div>

      {customerId && (
        <CreateUserDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} customerId={customerId} />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? 'this user'}?`}
        description="This permanently removes the user from ThingsBoard."
        isPending={deleteUser.isPending}
        error={deleteUser.error}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteUser.mutate(pendingDelete.id, { onSuccess: closeDeleteDialog });
        }}
      />
    </div>
  );
}
