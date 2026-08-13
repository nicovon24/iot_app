import {
  AlertTriangle,
  BarChart3,
  BatteryMedium,
  CalendarDays,
  Flame,
  Gauge,
  Hash,
  LayoutGrid,
  LineChart,
  Map as MapIcon,
  MapPinned,
  PieChart,
  ScatterChart,
  Signal,
  Sigma,
  Table,
  TableProperties,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Frontend mirror of backend/src/dashboards/widget-registry.ts — UI metadata only (which
 * pickers the Add-widget panel needs to show for each type), not validation. The actual
 * config-shape validation stays backend-only (Zod); duplicating that here would just be
 * two places that can drift. Adding a new widget type means adding one entry here (for the
 * Add-widget panel) and one case in DashboardWidgetRenderer's switch — no other file changes.
 */
export const WIDGET_TYPES = [
  'value-tile',
  'value-cards',
  'gauge',
  'battery',
  'rssi',
  'line-chart',
  'bar-chart',
  'scatter',
  'donut',
  'calendar-heatmap',
  'attributes-table',
  'timeseries-table',
  'alarms-list',
  'alarm-count',
  'map',
  'value-map',
  'movement-heatmap',
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

/**
 * Three-state instead of a boolean because the backend Zod schemas already accept an
 * *optional* entity on `map` and `alarms-list` (omitted = fleet map / tenant-wide alarms,
 * present = scoped to one entity). A boolean `needsEntity` could only say "always" or
 * "never", so those two widgets could never be entity-scoped from the UI — the config
 * panel silently dropped a capability the API supports.
 */
export type ConfigRequirement = 'required' | 'optional' | 'none';

/** Gallery grouping — keeps the picker scannable as the widget count grows. */
export const WIDGET_CATEGORIES = ['Cards', 'Gauges', 'Charts', 'Tables', 'Alarms', 'Maps', 'Heatmaps'] as const;
export type WidgetCategory = (typeof WIDGET_CATEGORIES)[number];

/** Icon for the category step of the Add-widget dialog. Declared per category rather than
 * borrowed from the first widget in the group, which made the whole category read as whatever
 * happened to be declared first. */
export const CATEGORY_ICONS: Record<WidgetCategory, LucideIcon> = {
  Cards: Hash,
  Gauges: Gauge,
  Charts: LineChart,
  Tables: Table,
  Alarms: AlertTriangle,
  Maps: MapIcon,
  Heatmaps: Flame,
};

export interface WidgetTypeMeta {
  label: string;
  /** Short description shown on the widget gallery card. */
  description: string;
  /** Icon shown on the widget gallery card. */
  icon: LucideIcon;
  category: WidgetCategory;
  /** Whether this widget type needs a Device/Asset picked. */
  entity: ConfigRequirement;
  /** Whether this widget type needs a telemetry key on top of the entity. */
  telemetryKey: ConfigRequirement;
  /**
   * Whether the widget takes a *list* of telemetry keys (config `telemetryKeys`) rather than
   * one (`telemetryKey`). Changes the picker from a select to a multi-check list.
   */
  multiTelemetryKeys: boolean;
  /** Which entity kinds this widget accepts. */
  entityKinds: Array<'DEVICE' | 'ASSET'>;
  /**
   * Whether this widget can bind to *every* entity of a type (config `entityScope: 'ALL'`)
   * and render one series/row/marker per entity. False for widgets whose visual only makes
   * sense for a single subject.
   */
  supportsAllScope: boolean;
  /** Whether this widget's config carries a `dataKeys` column list (table widgets). */
  supportsDataKeys: boolean;
  /** Label for the "no entity" choice, shown only when `entity` is 'optional'. */
  unscopedLabel?: string;
  /** Default grid footprint when added via the panel. */
  defaultLayout: { w: number; h: number };
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetTypeMeta> = {
  'value-tile': {
    label: 'Value Tile',
    description: 'Latest value — one entity or a live grid of all',
    icon: Hash,
    category: 'Cards',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    defaultLayout: { w: 2, h: 2 },
  },
  'value-cards': {
    label: 'Value Cards',
    description: 'A card per entity with several measures each',
    icon: LayoutGrid,
    category: 'Cards',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: true,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    defaultLayout: { w: 6, h: 4 },
  },
  gauge: {
    label: 'Gauge',
    description: 'One value against a calibrated range',
    icon: Gauge,
    category: 'Gauges',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    // A dial shows one subject against one range; N entities would need N dials, which is
    // what Value Cards is for.
    supportsAllScope: false,
    supportsDataKeys: false,
    defaultLayout: { w: 3, h: 3 },
  },
  battery: {
    label: 'Battery',
    description: 'Charge level as a filling battery',
    icon: BatteryMedium,
    category: 'Gauges',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: false,
    supportsDataKeys: false,
    defaultLayout: { w: 2, h: 2 },
  },
  rssi: {
    label: 'Signal Strength',
    description: 'Radio signal as stepped bars',
    icon: Signal,
    category: 'Gauges',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: false,
    supportsDataKeys: false,
    defaultLayout: { w: 2, h: 2 },
  },
  'line-chart': {
    label: 'Line Chart',
    description: 'Time series — one line per entity',
    icon: LineChart,
    category: 'Charts',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    defaultLayout: { w: 4, h: 3 },
  },
  'bar-chart': {
    label: 'Bar Chart',
    description: 'Time series as bars — one group per entity',
    icon: BarChart3,
    category: 'Charts',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    defaultLayout: { w: 4, h: 3 },
  },
  scatter: {
    label: 'Scatter Chart',
    description: 'One value against another, or against time — rssi vs snr, power over time',
    icon: ScatterChart,
    category: 'Charts',
    entity: 'required',
    // The two axis keys have their own pickers in the config panel rather than going through
    // the generic telemetryKey field, since which key goes on which axis is the whole point.
    telemetryKey: 'none',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    defaultLayout: { w: 4, h: 4 },
  },
  donut: {
    label: 'Donut Chart',
    description: 'How a total splits by category',
    icon: PieChart,
    category: 'Charts',
    entity: 'optional',
    telemetryKey: 'none',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    unscopedLabel: 'Everything',
    defaultLayout: { w: 4, h: 3 },
  },
  // widgetType stays 'attributes-table' for back-compat with saved dashboards; the label
  // changed because the widget now carries telemetry columns too, not just attributes.
  'calendar-heatmap': {
    label: 'Calendar Heatmap',
    description: 'A cell per day, coloured by that day’s value',
    icon: CalendarDays,
    category: 'Heatmaps',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    // One grid means one subject: overlaying several entities on the same cells would have to
    // pick one of their values to show.
    supportsAllScope: false,
    supportsDataKeys: false,
    defaultLayout: { w: 6, h: 3 },
  },
  'attributes-table': {
    label: 'Entity Table',
    description: 'Pick attribute and telemetry columns',
    icon: Table,
    category: 'Tables',
    entity: 'required',
    telemetryKey: 'none',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: true,
    defaultLayout: { w: 5, h: 4 },
  },
  'timeseries-table': {
    label: 'Timeseries Table',
    description: 'History as a table — a row per timestamp',
    icon: TableProperties,
    category: 'Tables',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: true,
    entityKinds: ['DEVICE', 'ASSET'],
    // Rows are timestamps, so a second entity would need its own set of columns and the table
    // stops being readable. One subject's history, like the gauge shows one subject's value.
    supportsAllScope: false,
    supportsDataKeys: false,
    defaultLayout: { w: 6, h: 4 },
  },
  'alarms-list': {
    label: 'Alarms List',
    description: 'Alarms tenant-wide or for one entity',
    icon: AlertTriangle,
    category: 'Alarms',
    entity: 'optional',
    telemetryKey: 'none',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    // ALL scope here means "every alarm raised by devices" vs "…by assets" — a different
    // question from the unscoped "every alarm in the tenant", which is why both exist.
    supportsAllScope: true,
    supportsDataKeys: false,
    unscopedLabel: 'All alarms',
    defaultLayout: { w: 4, h: 3 },
  },
  'alarm-count': {
    label: 'Alarm Count',
    description: 'How many alarms match a severity/status filter',
    icon: Sigma,
    category: 'Alarms',
    entity: 'optional',
    telemetryKey: 'none',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    unscopedLabel: 'All alarms',
    defaultLayout: { w: 2, h: 2 },
  },
  map: {
    label: 'Map',
    description: 'All devices or assets on a map, or just one',
    icon: MapIcon,
    category: 'Maps',
    entity: 'optional',
    telemetryKey: 'none',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    unscopedLabel: 'Whole fleet',
    defaultLayout: { w: 6, h: 4 },
  },
  // widgetType stays 'value-map' for back-compat with saved dashboards; only the label changed.
  'value-map': {
    label: 'Telemetry Map',
    description: 'Fleet markers coloured by a telemetry value',
    icon: MapPinned,
    category: 'Heatmaps',
    entity: 'required',
    telemetryKey: 'required',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    supportsAllScope: true,
    supportsDataKeys: false,
    defaultLayout: { w: 6, h: 4 },
  },
  'movement-heatmap': {
    label: 'Movement Heatmap',
    description: 'Where a sensor spent its time, from position history',
    icon: Flame,
    category: 'Heatmaps',
    entity: 'required',
    telemetryKey: 'none',
    multiTelemetryKeys: false,
    entityKinds: ['DEVICE', 'ASSET'],
    // Several entities' trails pile onto one heat surface, which is exactly the fleet-coverage
    // question ("where has anything of ours been"), so ALL scope is meaningful here.
    supportsAllScope: true,
    supportsDataKeys: false,
    defaultLayout: { w: 6, h: 4 },
  },
};

/** Widget types that make sense as "one widget per telemetry key" in a bulk-add batch. */
export const BULK_WIDGET_TYPES = WIDGET_TYPES.filter(
  (t) =>
    WIDGET_REGISTRY[t].entity === 'required' &&
    WIDGET_REGISTRY[t].telemetryKey === 'required' &&
    !WIDGET_REGISTRY[t].multiTelemetryKeys,
);

/** Gallery order — categories in declaration order, widgets grouped under each. */
export function widgetsByCategory(): Array<{ category: WidgetCategory; types: WidgetType[] }> {
  return WIDGET_CATEGORIES.map((category) => ({
    category,
    types: WIDGET_TYPES.filter((t) => WIDGET_REGISTRY[t].category === category),
  })).filter((group) => group.types.length > 0);
}
