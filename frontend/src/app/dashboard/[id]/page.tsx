'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layers, Maximize2, Pencil, Plus, Save, ScrollText, Sparkles } from 'lucide-react';
import type { Layout } from 'react-grid-layout';
import { ApiError, apiClient } from '@/lib';
import { useCreateDashboard, useDashboard, useSaveDashboard } from '@/hooks';
import { usePermissions } from '@/hooks';
import { toastError, toastSuccess } from '@/lib';
import {
  DashboardCanvas,
  AddWidgetPanel,
  type NewWidgetInput,
  BulkAddPanel,
  AiDashboardPanel,
  draftChanges,
  TimeWindowPicker,
  TimeWindowProvider,
} from '@/components';
import { Tooltip } from '@/components';
import { Input } from '@/components';
import type {
  Dashboard,
  DashboardLayoutMode,
  DashboardTimeWindow,
  DashboardWidget,
  SaveDashboardInput,
} from '@/types';

type StagedWidget = Omit<DashboardWidget, 'id' | 'dashboardId'> & { id: string };

function toStaged(widgets: DashboardWidget[]): StagedWidget[] {
  return widgets.map((w) => ({
    id: w.id,
    widgetType: w.widgetType,
    config: w.config,
    layout: w.layout,
  }));
}

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNew = params.id === 'new';
  const aiEntryRequested = isNew && searchParams.get('ai') === '1';
  const { canWrite } = usePermissions();

  const dashboardQuery = useDashboard(isNew ? undefined : params.id);
  const createDashboard = useCreateDashboard();
  const saveDashboard = useSaveDashboard();

  const [editMode, setEditMode] = useState(isNew);
  const [title, setTitle] = useState('New dashboard');
  const [staged, setStaged] = useState<StagedWidget[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(aiEntryRequested);
  const [aiProposal, setAiProposal] = useState<{
    previousTitle: string;
    previousWidgets: StagedWidget[];
    added: number;
    changed: number;
    moved: number;
    removed: number;
    conversationId?: string;
  } | null>(null);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [timeWindow, setTimeWindow] = useState<DashboardTimeWindow | null>(null);
  const [layoutMode, setLayoutMode] = useState<DashboardLayoutMode>('SCROLL');
  const [loadedFrom, setLoadedFrom] = useState<Dashboard | null>(null);

  useEffect(() => {
    // A sidebar visit can reuse this route component when coming from another dashboard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiPanelOpen(aiEntryRequested);
  }, [aiEntryRequested, params.id]);

  useEffect(() => {
    if (!dashboardQuery.data) return;
    // Seeding the editable fields is keyed on the dashboard id so a refetch doesn't clobber
    // edits in progress. `loadedFrom` is refreshed on every fetch regardless: it carries the
    // non-editable fields (visibility, customer access) that each save sends back unchanged,
    // and holding a stale copy would write yesterday's sharing settings on the next save.
    if (dashboardQuery.data.id !== loadedFrom?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(dashboardQuery.data.title);
      setTimeWindow(dashboardQuery.data.timeWindow ?? null);
      setLayoutMode(dashboardQuery.data.layoutMode ?? 'SCROLL');
      setStaged(toStaged(dashboardQuery.data.widgets ?? []));
    }
    setLoadedFrom(dashboardQuery.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardQuery.data]);

  function handleLayoutChange(layout: Layout[]) {
    setStaged((prev) => {
      const changed = prev.some((w) => {
        const l = layout.find((li) => li.i === w.id);
        return (
          l &&
          (w.layout.x !== l.x || w.layout.y !== l.y || w.layout.w !== l.w || w.layout.h !== l.h)
        );
      });
      if (!changed) return prev;
      return prev.map((w) => {
        const l = layout.find((li) => li.i === w.id);
        return l ? { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
      });
    });
  }

  function handleAddWidget(newWidget: NewWidgetInput) {
    setStaged((prev) => [
      ...prev,
      {
        id: `staged-${Date.now()}-${prev.length}`,
        widgetType: newWidget.widgetType,
        config: newWidget.config,
        layout: newWidget.layout,
      },
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

  function handleAiDraft(draft: {
    title: string;
    widgets: NewWidgetInput[];
    conversationId?: string;
  }) {
    const changes = draftChanges(staged, draft.widgets);
    setAiProposal({
      previousTitle: aiProposal?.previousTitle ?? title,
      previousWidgets: aiProposal?.previousWidgets ?? staged,
      ...changes,
      conversationId: draft.conversationId,
    });
    setTitle(draft.title);
    setStaged(
      draft.widgets.map((widget, index) => ({
        ...widget,
        id: `ai-${Date.now()}-${index}`,
      })),
    );
    setEditMode(true);
  }

  async function handleSave() {
    const dto: SaveDashboardInput = {
      title,
      visibility: loadedFrom?.visibility ?? 'PRIVATE',
      customerScope: loadedFrom?.customerScope ?? 'SPECIFIC',
      customerIds: loadedFrom?.customerAccess.map((a) => a.customerId) ?? [],
      timeWindow,
      layoutMode,
      widgets: staged.map((w) => ({
        widgetType: w.widgetType,
        config: w.config,
        layout: w.layout,
      })),
    };

    try {
      if (isNew) {
        const created = await createDashboard.mutateAsync(dto);
        if (aiProposal?.conversationId) {
          try {
            await apiClient.put(
              `/dashboards/ai-conversations/${aiProposal.conversationId}/dashboard`,
              {
                dashboardId: created.id,
              },
            );
          } catch (error) {
            toastError('El dashboard se guardó, pero no se pudo asociar el historial de IA', error);
          }
        }
        toastSuccess('Dashboard created');
        router.replace(`/dashboard/${created.id}`);
      } else {
        await saveDashboard.mutateAsync({ id: params.id, dto });
        toastSuccess('Dashboard saved');
        setEditMode(false);
        setAiProposal(null);
      }
    } catch (err) {
      toastError('Could not save dashboard', err);
    }
  }

  if (!isNew && dashboardQuery.isError) {
    const notFound =
      dashboardQuery.error instanceof ApiError && dashboardQuery.error.status === 404;
    const forbidden =
      dashboardQuery.error instanceof ApiError && dashboardQuery.error.status === 403;
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
          <h1 className="t-heading text-lg">{title}</h1>
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
                    ? 'border-accent bg-tint-strong text-accent'
                    : 'border-border text-muted hover:bg-tint'
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
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 t-field hover:bg-tint"
                >
                  <Plus size={15} /> Add widget
                </button>
                <button
                  type="button"
                  onClick={() => setBulkPanelOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 t-field hover:bg-tint"
                >
                  <Layers size={15} /> Bulk add
                </button>
                <button
                  type="button"
                  onClick={() => setAiPanelOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 t-field hover:bg-tint"
                >
                  <Sparkles size={15} /> Crear con IA
                </button>
              </>
            )}
            {editMode ? (
              <button
                type="button"
                onClick={handleSave}
                className="btn-accent flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold"
              >
                <Save size={15} /> Save
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 t-field hover:bg-tint"
              >
                <Pencil size={15} /> Edit
              </button>
            )}
          </div>
        )}
      </div>

      {aiProposal && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent px-3 py-2 text-sm text-muted">
          <span>
            Propuesta de IA sin guardar · {aiProposal.added} agregados · {aiProposal.changed}{' '}
            cambiados · {aiProposal.moved} movidos · {aiProposal.removed} quitados. Revisá los
            widgets antes de guardar.
          </span>
          <button
            type="button"
            onClick={() => {
              setTitle(aiProposal.previousTitle);
              setStaged(aiProposal.previousWidgets);
              setAiProposal(null);
            }}
            className="text-heading underline"
          >
            Descartar propuesta
          </button>
        </div>
      )}

      <div
        className={`min-h-0 flex-1 ${layoutMode === 'FIT' ? 'overflow-hidden' : 'overflow-auto'}`}
      >
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
      <AiDashboardPanel
        key={params.id}
        isOpen={canWrite && aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        onDraft={handleAiDraft}
        dashboardId={isNew ? undefined : params.id}
        currentTitle={title}
        currentWidgets={staged}
      />
    </div>
  );
}
