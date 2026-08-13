'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, LayoutDashboard, Lock, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Spinner } from '@heroui/react';
import { useDashboards, useDeleteDashboard } from '@/hooks';
import { usePermissions } from '@/hooks';
import { Tooltip } from '@/components';
import { ConfirmDialog } from '@/widgets';
import { toastError, toastSuccess } from '@\/lib';
import type { Dashboard } from '@/types';

/**
 * Gallery of user-built dashboards. The fixed fleet summary that used to live at this route
 * moved to `/` (Overview) — this page is only about dashboards you can create and edit.
 */
export default function DashboardsPage() {
  const router = useRouter();
  const { canWrite } = usePermissions();
  const { data, isLoading, isError, error } = useDashboards();
  const deleteDashboard = useDeleteDashboard();
  const [pendingRemoval, setPendingRemoval] = useState<Dashboard | null>(null);

  async function confirmDelete() {
    if (!pendingRemoval) return;
    try {
      await deleteDashboard.mutateAsync(pendingRemoval.id);
      toastSuccess('Dashboard deleted');
      setPendingRemoval(null);
    } catch (err) {
      toastError('Could not delete dashboard', err);
    }
  }

  const dashboards = data ?? [];

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-heading">Dashboards</h1>
        {canWrite && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/new')}
            style={{ background: 'var(--gradient-accent)' }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-white"
          >
            <Plus size={15} /> New dashboard
          </button>
        )}
      </div>

      <div className="table-scroll min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="glass-card flex h-40 items-center justify-center">
            <Spinner label="Loading dashboards…" color="primary" />
          </div>
        ) : isError ? (
          <div className="glass-card flex h-40 items-center justify-center">
            <p className="text-sm text-danger">
              Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
            {/* Overview is the fixed fleet-summary dashboard — always shown first, not part of
                the user-built gallery, so it has no edit/delete actions. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => router.push('/')}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                router.push('/');
              }}
              className="group glass-card relative flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-accent"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Home size={17} className="text-white" strokeWidth={1.75} />
              </span>

              <div className="flex flex-col gap-1">
                <span className="truncate text-sm font-semibold text-heading">Overview</span>
                <span className="text-xs text-muted">Fleet summary</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-faint">Default dashboard</div>
            </div>

            {dashboards.length === 0 ? (
              <div className="glass-card flex h-40 flex-col items-center justify-center gap-3 text-center">
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ background: 'var(--gradient-accent)' }}
                >
                  <LayoutDashboard size={20} className="text-white" strokeWidth={1.75} />
                </span>
                <p className="text-sm font-medium text-muted">
                  {canWrite ? 'No dashboards yet — create your first one.' : 'No dashboards shared with you yet.'}
                </p>
              </div>
            ) : (
              dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/${dashboard.id}`)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  router.push(`/dashboard/${dashboard.id}`);
                }}
                className="group glass-card relative flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    <LayoutDashboard size={17} className="text-white" strokeWidth={1.75} />
                  </span>

                  {canWrite && (
                    // stopPropagation so the card's own navigation doesn't fire underneath.
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <Tooltip label="Edit dashboard" side="top">
                        <button
                          type="button"
                          aria-label="Edit dashboard"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/${dashboard.id}`);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-border hover:text-heading"
                        >
                          <Pencil size={13} />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete dashboard" side="top">
                        <button
                          type="button"
                          aria-label="Delete dashboard"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingRemoval(dashboard);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-danger hover:text-white"
                        >
                          <Trash2 size={13} />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="truncate text-sm font-semibold text-heading" title={dashboard.title}>
                    {dashboard.title}
                  </span>
                  <span className="text-xs text-muted">
                    {dashboard._count?.widgets ?? 0} widget{(dashboard._count?.widgets ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-faint">
                  {dashboard.visibility === 'PRIVATE' ? (
                    <>
                      <Lock size={12} /> Private
                    </>
                  ) : (
                    <>
                      <Users size={12} />
                      {dashboard.customerScope === 'ALL' ? 'All clients' : `${dashboard.customerAccess.length} client(s)`}
                    </>
                  )}
                </div>
              </div>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingRemoval)}
        title="Delete dashboard"
        description={`Delete "${pendingRemoval?.title ?? ''}" and all of its widgets? This cannot be undone.`}
        isPending={deleteDashboard.isPending}
        error={deleteDashboard.error}
        onConfirm={confirmDelete}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  );
}
