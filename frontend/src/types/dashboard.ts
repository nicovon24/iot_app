export type DashboardVisibility = 'PRIVATE' | 'SHARED';
export type DashboardCustomerScope = 'ALL' | 'SPECIFIC';

/** SCROLL = fixed rows, page scrolls. FIT = rows sized so the grid fills the viewport exactly. */
export type DashboardLayoutMode = 'SCROLL' | 'FIT';

export interface DashboardWidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  dashboardId?: string;
  widgetType: string;
  config: Record<string, unknown>;
  layout: DashboardWidgetLayout;
}

export interface DashboardCustomerAccess {
  id: string;
  dashboardId: string;
  customerId: string;
}

/**
 * Range every timeseries widget on a dashboard reads over — mirrors
 * backend/src/dashboards/time-window.ts.
 *
 * LAST is a rolling window resolved at render time, so a saved dashboard still shows "the last
 * 24 hours" next month. FIXED pins absolute bounds, for looking at a specific incident.
 */
export type DashboardTimeWindow =
  | { kind: 'LAST'; ms: number }
  | { kind: 'FIXED'; startTs: number; endTs: number };

export interface Dashboard {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  visibility: DashboardVisibility;
  customerScope: DashboardCustomerScope;
  /** Null/absent on dashboards saved before time windows existed. */
  timeWindow?: DashboardTimeWindow | null;
  layoutMode?: DashboardLayoutMode;
  /** Only populated by GET /dashboards/:id. The list endpoint omits widgets and sends
   * `_count.widgets` instead, so anything rendering a list must not assume this is present. */
  widgets?: DashboardWidget[];
  /** Only populated by GET /dashboards (the list endpoint). */
  _count?: { widgets: number };
  customerAccess: DashboardCustomerAccess[];
}

/** Body for both POST /dashboards and PUT /dashboards/:id — mirrors backend/src/dashboards/dto/save-dashboard.dto.ts */
export interface SaveDashboardInput {
  title: string;
  visibility: DashboardVisibility;
  customerScope: DashboardCustomerScope;
  customerIds: string[];
  timeWindow?: DashboardTimeWindow | null;
  layoutMode?: DashboardLayoutMode;
  widgets: Array<{
    widgetType: string;
    config: Record<string, unknown>;
    layout: DashboardWidgetLayout;
  }>;
}
