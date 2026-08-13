import { AlertTriangle, Gauge, Hash, LayoutGrid, LineChart, Map as MapIcon, Table } from 'lucide-react';
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
  'line-chart',
  'attributes-table',
  'alarms-list',
  'map',
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
export const WIDGET_CATEGORIES = ['Cards', 'Charts', 'Tables', 'Alarms', 'Maps'] as const;
export type WidgetCategory = (typeof WIDGET_CATEGORIES)[number];

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
    category: 'Charts',
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
  // widgetType stays 'attributes-table' for back-compat with saved dashboards; the label
  // changed because the widget now carries telemetry columns too, not just attributes.
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
