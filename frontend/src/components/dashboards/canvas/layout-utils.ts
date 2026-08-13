import type { DashboardWidgetLayout } from '@/types';

/**
 * Simple row-packing: places new widgets left-to-right starting below everything already
 * on the grid, wrapping to a new row when a widget wouldn't fit before `cols`. Intentionally
 * not a real bin-packer — react-grid-layout's own vertical compaction cleans up any
 * imperfection once rendered, this just avoids stacking every new widget one-per-row.
 */
export function packWidgets(
  existing: DashboardWidgetLayout[],
  newSizes: { w: number; h: number }[],
  cols = 12,
): DashboardWidgetLayout[] {
  let cursorY = existing.reduce((max, l) => Math.max(max, l.y + l.h), 0);
  let cursorX = 0;
  let rowHeight = 0;
  const result: DashboardWidgetLayout[] = [];

  for (const size of newSizes) {
    if (cursorX + size.w > cols) {
      cursorX = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }
    result.push({ x: cursorX, y: cursorY, w: size.w, h: size.h });
    cursorX += size.w;
    rowHeight = Math.max(rowHeight, size.h);
  }

  return result;
}
