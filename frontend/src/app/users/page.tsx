'use client';

import { useState } from 'react';
import { Plus, Trash2, LogIn } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { useImpersonate } from '@/hooks/useImpersonation';
import { usePermissions } from '@/hooks/useCurrentUser';
import { Select } from '@/components/ui/Select';
import { Tooltip } from '@/components/ui/Tooltip';
import { CreateUserDialog } from '@/widgets/forms/CreateUserDialog';
import { ConfirmDialog } from '@/widgets/forms/ConfirmDialog';
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
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">Users</h1>
        {isSysadmin && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={!customerId}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-40"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>

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

      <div className="glass-card min-h-0 flex-1 overflow-y-auto p-2">
        {isUsersLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">Loading…</div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center text-sm text-red-400">
            {error instanceof Error ? error.message : 'Failed to load users'}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">No users found</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-heading">{user.name}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                    {roleOf(user)}
                  </span>
                  {!customerId && user.customerId?.id && (
                    <span className="text-xs text-muted">{customerNameById.get(user.customerId.id) ?? ''}</span>
                  )}
                </div>
                {isSysadmin && (
                  <div className="flex items-center gap-1">
                    <Tooltip label="Login as">
                      <button
                        type="button"
                        onClick={() => impersonate.mutate({ id: user.id, label: user.name })}
                        disabled={impersonate.isPending}
                        className="rounded-full p-1.5 text-body transition hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label={`Login as ${user.name}`}
                      >
                        <LogIn size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <button
                        type="button"
                        onClick={() => setPendingDelete(user)}
                        className="rounded-full p-1.5 text-body transition hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Delete ${user.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
