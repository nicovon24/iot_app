'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layers, Maximize2, Pencil, Plus, Save, ScrollText } from 'lucide-react';
import type { Layout } from 'react-grid-layout';
import { ApiError } from '@/lib/api-client';
import { useCreateDashboard, useDashboard, useSaveDashboard } from '@/hooks/useDashboards';
import { usePermissions } from '@/hooks/useCurrentUser';
import { toastError, toastSuccess } from '@/lib/toast';
import { DashboardCanvas } from '@/dashboards/DashboardCanvas';
import { AddWidgetPanel, type NewWidgetInput } from '@/dashboards/AddWidgetPanel';
import { BulkAddPanel } from '@/dashboards/BulkAddPanel';
import { TimeWindowPicker, TimeWindowProvider } from '@/dashboards/TimeWindowPicker';
import { Tooltip } from '@/components/ui/Tooltip';
import { Input } from '@/components/ui/Input';
import type {
  Dashboard,
  DashboardLayoutMode,
  DashboardTimeWindow,
  DashboardWidget,
  SaveDashboardInput,
} from '@/types';

type StagedWidget = Omit<DashboardWidget, 'id' | 'dashboardId'> & { id: string };

function toStaged(widgets: DashboardWidget[]): StagedWidget[] {
  return widgets.map((w) => ({ id: w.id, widgetType: w.widgetType, config: w.config, layout: w.layout }));
}

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';
  const { canWrite } = usePermissions();

  const dashboardQuery = useDashboard(isNew ? undefined : params.id);
  const createDashboard = useCreateDashboard();
  const saveDashboard = useSaveDashboard();

  const [editMode, setEditMode] = useState(isNew);
  const [title, setTitle] = useState('New dashboard');
  const [staged, setStaged] = useState<StagedWidget[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [timeWindow, setTimeWindow] = useState<DashboardTimeWindow | null>(null);
  const [layoutMode, setLayoutMode] = useState<DashboardLayoutMode>('SCROLL');
  const [loadedFrom, setLoadedFrom] = useState<Dashboard | null>(null);

  useEffect(() => {
    if (dashboardQuery.data && dashboardQuery.data.id !== loadedFrom?.id) {
      setTitle(dashboardQuery.data.title);
      setTimeWindow(dashboardQuery.data.timeWindow ?? null);
      setLayoutMode(dashboardQuery.data.layoutMode ?? 'SCROLL');
      setStaged(toStaged(dashboardQuery.data.widgets ?? []));
      setLoadedFrom(dashboardQuery.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardQuery.data]);

  function handleLayoutChange(layout: Layout[]) {
    setStaged((prev) =>
      prev.map((w) => {
        const l = layout.find((li) => li.i === w.id);
        return l ? { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
      }),
    );
  }

  function handleAddWidget(newWidget: NewWidgetInput) {
    setStaged((prev) => [
      ...prev,
      { id: `staged-${Date.now()}-${prev.length}`, widgetType: newWidget.widgetType, config: newWidget.config, layout: newWidget.layout },
    ]);
  }

  function handleRemoveWidget(widgetKey: string) {
    setStaged((prev) => prev.filter((w) => w.id !== widgetKey));
  }

  function handleEditWidget(widget: DashboardWidget) {
    setEditingWidget(widget);
    setPanelOpen(true);
  }

  function handleUpdateWidget(widgetKey: string, config: Record<string, unknown>) {
    setStaged((prev) => prev.map((w) => (w.id === widgetKey ? { ...w, config } : w)));
    setEditingWidget(null);
  }

  function handleClosePanel() {
    setPanelOpen(false);
    setEditingWidget(null);
  }

  function handleBulkAdd(widgets: NewWidgetInput[]) {
    setStaged((prev) => [
      ...prev,
      ...widgets.map((w, i) => ({
        id: `staged-${Date.now()}-${prev.length + i}`,
        widgetType: w.widgetType,
        config: w.config,
        layout: w.layout,
      })),
    ]);
  }

  async function handleSave() {
    const dto: SaveDashboardInput = {
      title,
      visibility: loadedFrom?.visibility ?? 'PRIVATE',
      customerScope: loadedFrom?.customerScope ?? 'SPECIFIC',
      customerIds: loadedFrom?.customerAccess.map((a) => a.customerId) ?? [],
      timeWindow,
      layoutMode,
      widgets: staged.map((w) => ({ widgetType: w.widgetType, config: w.config, layout: w.layout })),
    };

    try {
      if (isNew) {
        const created = await createDashboard.mutateAsync(dto);
        toastSuccess('Dashboard created');
        router.replace(`/dashboard/${created.id}`);
      } else {
        await saveDashboard.mutateAsync({ id: params.id, dto });
        toastSuccess('Dashboard saved');
        setEditMode(false);
      }
    } catch (err) {
      toastError('Could not save dashboard', err);
    }
  }

  if (!isNew && dashboardQuery.isError) {
    const notFound = dashboardQuery.error instanceof ApiError && dashboardQuery.error.status === 404;
    const forbidden = dashboardQuery.error instanceof ApiError && dashboardQuery.error.status === 403;
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">
          {notFound
            ? 'Dashboard not found.'
            : forbidden
              ? "You don't have access to this dashboard."
              : 'Failed to load dashboard.'}
        </p>
      </div>
    );
  }

  if (!isNew && dashboardQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        {editMode ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Dashboard title"
            className="!text-lg !font-semibold"
          />
        ) : (
          <h1 className="text-lg font-semibold text-heading">{title}</h1>
        )}

        {/* Outside the canWrite gate on purpose: a read-only viewer must be able to change the
          * range they're looking at. In view mode the change is transient — only editing and
          * saving persists it. */}
        <div className="ml-auto mr-2 flex shrink-0 items-center gap-2">
          <TimeWindowPicker value={timeWindow} onChange={setTimeWindow} />
          {canWrite && editMode && (
            <Tooltip
              label={layoutMode === 'FIT' ? 'Fit to screen (no scroll)' : 'Scrolling layout'}
              side="bottom"
            >
              <button
                type="button"
                aria-label="Toggle layout mode"
                onClick={() => setLayoutMode((m) => (m === 'FIT' ? 'SCROLL' : 'FIT'))}
                className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                  layoutMode === 'FIT'
                    ? 'border-accent bg-surface text-accent'
                    : 'border-border text-muted hover:bg-surface'
                }`}
              >
                {layoutMode === 'FIT' ? <Maximize2 size={16} /> : <ScrollText size={16} />}
              </button>
            </Tooltip>
          )}
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            {editMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    // Clear any previous edit target, otherwise the panel would reopen seeded
                    // with the last-edited widget instead of the gallery.
                    setEditingWidget(null);
                    setPanelOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-body hover:bg-surface"
                >
                  <Plus size={15} /> Add widget
                </button>
                <button
                  type="button"
                  onClick={() => setBulkPanelOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-body hover:bg-surface"
                >
                  <Layers size={15} /> Bulk add
                </button>
              </>
            )}
            {editMode ? (
              <button
                type="button"
                onClick={handleSave}
                style={{ background: 'var(--gradient-accent)' }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-white"
              >
                <Save size={15} /> Save
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-body hover:bg-surface"
              >
                <Pencil size={15} /> Edit
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`min-h-0 flex-1 ${layoutMode === 'FIT' ? 'overflow-hidden' : 'overflow-auto'}`}>
        <TimeWindowProvider value={timeWindow}>
          <DashboardCanvas
            widgets={staged}
            editMode={editMode}
            onLayoutChange={handleLayoutChange}
            onRemoveWidget={handleRemoveWidget}
            onEditWidget={handleEditWidget}
            layoutMode={layoutMode}
          />
        </TimeWindowProvider>
      </div>

      <AddWidgetPanel
        isOpen={panelOpen}
        onClose={handleClosePanel}
        existingLayouts={staged.map((w) => w.layout)}
        onAdd={handleAddWidget}
        editWidget={editingWidget}
        onUpdate={handleUpdateWidget}
      />

      <BulkAddPanel
        isOpen={bulkPanelOpen}
        onClose={() => setBulkPanelOpen(false)}
        existingLayouts={staged.map((w) => w.layout)}
        onAdd={handleBulkAdd}
      />
    </div>
  );
}
