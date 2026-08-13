'use client';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useEffect, useRef, useState } from 'react';
import RGL, { WidthProvider, type Layout } from 'react-grid-layout';
import { motion } from 'framer-motion';
import { GripVertical, Pencil, Trash2, X } from 'lucide-react';
import { ContextMenu } from '@/components';
import { Tooltip } from '@/components';
import { ConfirmDialog } from '@/widgets';
import { DashboardWidgetRenderer } from '../renderer';
import { WIDGET_REGISTRY, type WidgetType } from '../widget-config/widget-registry';
import type { DashboardWidget } from '@/types';

const GridLayout = WidthProvider(RGL);

/**
 * Only the widget's own chrome blocks a drag. Widget *content* doesn't need listing here
 * because it's made inert in edit mode (see `pointer-events-none` below) — trying to exempt
 * content by selector never worked: a Leaflet map paints its panes at z-index up to 1000 and
 * swallows the pointer, so map widgets in particular ended up with no draggable surface at all.
 *
 * `.widget-drag-grip` is exempt from the button rule on purpose — it *is* the drag affordance.
 */
const DRAG_CANCEL_SELECTOR = ['button:not(.widget-drag-grip)', 'a', 'input', 'select', 'textarea'].join(',');

/** Kept in sync with the exit animation below: the widget is only removed from state once
 * it has finished animating out, so the grid doesn't reflow mid-animation. */
const EXIT_DURATION_S = 0.18;

const ROW_HEIGHT_SCROLL = 80;
const GRID_MARGIN = 16;
/** Below this a "fitted" widget is unreadable; past it the dashboard scrolls after all. */
const MIN_FIT_ROW_HEIGHT = 24;

/**
 * Row height that makes every widget fit the visible area with no scrollbar — the equivalent of
 * ThingsBoard's "auto fill layout height".
 *
 * react-grid-layout sizes rows in absolute pixels, so "fill the viewport" can't be expressed in
 * CSS: the height has to be computed from the measured container and the tallest row in the
 * layout. Margins are subtracted because RGL adds one between every row *and* one above the
 * first and below the last.
 */
function fitRowHeight(containerHeight: number, layout: Layout[]): number {
  const totalRows = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
  if (totalRows === 0 || containerHeight === 0) return ROW_HEIGHT_SCROLL;
  const available = containerHeight - GRID_MARGIN * (totalRows + 1);
  return Math.max(MIN_FIT_ROW_HEIGHT, Math.floor(available / totalRows));
}

export function DashboardCanvas({
  widgets,
  editMode,
  onLayoutChange,
  onRemoveWidget,
  onEditWidget,
  layoutMode = 'SCROLL',
}: {
  widgets: DashboardWidget[];
  editMode: boolean;
  onLayoutChange: (layout: Layout[]) => void;
  onRemoveWidget: (widgetKey: string) => void;
  onEditWidget: (widget: DashboardWidget) => void;
  layoutMode?: 'SCROLL' | 'FIT';
}) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<DashboardWidget | null>(null);
  const [exitingKey, setExitingKey] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measured rather than read from a CSS value: the available height depends on the header,
  // the time-window picker and whether the app header is collapsed, none of which this
  // component knows about. A ResizeObserver keeps FIT correct through window resizes and the
  // header toggle without either of them having to notify the canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || layoutMode !== 'FIT') return;
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [layoutMode]);

  const layout: Layout[] = widgets.map((w, i) => ({
    i: w.id || `new-${i}`,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
  }));

  const rowHeight = layoutMode === 'FIT' ? fitRowHeight(containerHeight, layout) : ROW_HEIGHT_SCROLL;

  function confirmRemoval() {
    if (!pendingRemoval) return;
    const key = pendingRemoval.id;
    setPendingRemoval(null);
    setExitingKey(key);
  }

  if (widgets.length === 0) {
    return (
      <div className="glass-card flex h-full min-h-full items-center justify-center">
        <p className="text-sm text-muted">
          {editMode ? 'No widgets yet — click "Add widget" to get started.' : 'This dashboard has no widgets.'}
        </p>
      </div>
    );
  }

  const pendingLabel = pendingRemoval ? (WIDGET_REGISTRY[pendingRemoval.widgetType as WidgetType]?.label ?? 'widget') : '';

  return (
    <div
      ref={containerRef}
      // FIT owns the exact viewport height and must never scroll — that's the whole point.
      // SCROLL keeps min-h-full so a short dashboard still fills the area.
      className={`${layoutMode === 'FIT' ? 'h-full overflow-hidden' : 'min-h-full'} ${
        editMode ? 'dashboard-grid--editing' : ''
      }`}
    >
      <GridLayout
        layout={layout}
        cols={12}
        rowHeight={rowHeight}
        margin={[GRID_MARGIN, GRID_MARGIN]}
        isDraggable={editMode}
        isResizable={editMode}
        // RGL defaults to compactType="vertical", which floats every widget upward to close
        // gaps — that's why moving one widget made the ones below it jump up on their own.
        // null keeps each widget exactly where it was dropped, and preventCollision refuses a
        // drop onto occupied cells instead of shoving the occupant somewhere else.
        compactType={null}
        preventCollision
        draggableCancel={DRAG_CANCEL_SELECTOR}
        onLayoutChange={onLayoutChange}
        onDragStart={(_l, item) => setDraggingKey(item.i)}
        onDragStop={() => setDraggingKey(null)}
        onResizeStart={(_l, item) => setDraggingKey(item.i)}
        onResizeStop={() => setDraggingKey(null)}
      >
        {widgets.map((w, i) => {
          const key = w.id || `new-${i}`;
          const isDragging = draggingKey === key;
          const isExiting = exitingKey === key;
          return (
            <div key={key}>
              <motion.div
                className="group relative h-full w-full"
                animate={{
                  opacity: isExiting ? 0 : 1,
                  scale: isExiting ? 0.9 : isDragging ? 1.02 : 1,
                }}
                transition={{ duration: isExiting ? EXIT_DURATION_S : 0.15, ease: 'easeOut' }}
                onAnimationComplete={() => {
                  if (!isExiting) return;
                  setExitingKey(null);
                  onRemoveWidget(key);
                }}
                style={{ zIndex: isDragging ? 20 : undefined }}
              >
                {editMode && (
                  // One floating toolbar rather than controls scattered around the widget's
                  // edges. focus-within keeps it reachable by keyboard, where there's no hover.
                  // z-1100 clears Leaflet's own stack (panes 400–700, controls up to 1000);
                  // at a lower z-index this toolbar renders *underneath* a map widget.
                  <div className="absolute right-2 top-2 z-1100 flex items-center gap-0.5 rounded-md border border-border bg-surface/95 p-1 opacity-0 shadow-md backdrop-blur transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <Tooltip label="Drag widget" side="top">
                      {/* .widget-drag-grip is exempted from draggableCancel, so this stays a
                       * drag surface even though the selector cancels every other button. */}
                      <button
                        type="button"
                        aria-label="Drag widget"
                        className="widget-drag-grip flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted transition-colors hover:bg-border hover:text-heading active:cursor-grabbing"
                      >
                        <GripVertical size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Edit widget" side="top">
                      <button
                        type="button"
                        aria-label="Edit widget"
                        onClick={() => onEditWidget({ ...w, id: key })}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-border hover:text-heading"
                      >
                        <Pencil size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Remove widget" side="top">
                      <button
                        type="button"
                        aria-label="Remove widget"
                        onClick={() => setPendingRemoval({ ...w, id: key })}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-danger hover:text-white"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                  </div>
                )}
                <ContextMenu
                  disabled={!editMode}
                  items={[
                    { label: 'Edit widget', icon: Pencil, onSelect: () => onEditWidget({ ...w, id: key }) },
                    {
                      label: 'Remove widget',
                      icon: Trash2,
                      danger: true,
                      onSelect: () => setPendingRemoval({ ...w, id: key }),
                    },
                  ]}
                >
                  <div
                    className={`h-full w-full overflow-hidden rounded-xl transition-shadow ${
                      isDragging ? 'shadow-lg ring-2 ring-accent' : ''
                    }`}
                  >
                    {/* In edit mode the widget's content is inert, so the entire widget is a
                     * drag surface. You're arranging the dashboard here, not using it — and a
                     * map that pans (or a chart that captures hover) under the cursor is
                     * exactly what made widgets feel undraggable. The wrapper above stays
                     * interactive so drag and right-click still land. */}
                    <div className={`h-full w-full ${editMode ? 'pointer-events-none' : ''}`}>
                      <DashboardWidgetRenderer widget={w} />
                    </div>
                  </div>
                </ContextMenu>
              </motion.div>
            </div>
          );
        })}
      </GridLayout>

      <ConfirmDialog
        isOpen={Boolean(pendingRemoval)}
        title="Remove widget"
        description={`Remove this ${pendingLabel} from the dashboard? The change applies once you save.`}
        onConfirm={confirmRemoval}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  );
}
