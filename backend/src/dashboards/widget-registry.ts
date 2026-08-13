import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * The single place widget-type knowledge lives on the backend. Adding a new widget type
 * (e.g. a future gauge) means adding one entry to WIDGET_TYPES + one schema here — no
 * switch statement duplicated across the service/controller. This is the concrete
 * mechanism behind Phase 10's "extensible widget system" and "AI-readiness" requirements:
 * a well-typed, documented config shape per widgetType instead of a loose Json blob.
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

const entityTypeEnum = z.enum(['DEVICE', 'ASSET']);

/**
 * Presentation fields every widget type accepts, regardless of what it renders.
 *
 * Declared once and spread into both datasource builders rather than repeated per widget
 * type — five copies of the same two fields is five places to drift.
 *
 * `title` overrides the label the renderer would otherwise generate from the entity and key.
 * Omitted (never empty-string) means "use the generated one", so the frontend must drop the
 * field rather than save "" when the input is cleared.
 *
 * `action` is what a click on the widget's clickable unit (a table row, a card, a tile) does.
 * `NAVIGATE_STATE` is deliberately absent until dashboard states exist (10-05) — offering a
 * destination that can't be chosen yet would be a dead option in the UI.
 */
const presentation = {
  title: z.string().trim().min(1).max(120).optional(),
  action: z.enum(['NONE', 'ENTITY_DETAILS']).optional(),
};

/**
 * A widget's datasource is one of two shapes:
 *
 *   { entityId, entityType }            → one specific entity, pinned forever
 *   { entityScope: 'ALL', entityType }  → every entity of that type, resolved live
 *
 * The 'ALL' form is what makes a dashboard survive fleet growth: it stores a *filter*,
 * not a list of ids, so a device registered next month shows up in the widget without
 * anyone reopening the dashboard editor. Storing resolved ids at build time (what the
 * bulk-add flow used to do) freezes the widget to the fleet as it was that day.
 *
 * `datasource()` builds the strict form used by widgets that require an entity. The two
 * fields are mutually exclusive — accepting both would leave the renderer guessing which
 * one wins, so it's rejected at the edge instead.
 */
// Generic over `extra` so the widget-specific fields survive into the inferred type —
// otherwise a caller chaining another .refine() (the gauge's min < max) can't see them.
function datasource<T extends z.ZodRawShape>(extra: T = {} as T) {
  return z
    .object({
      entityId: z.string().uuid().optional(),
      entityScope: z.literal('ALL').optional(),
      entityType: entityTypeEnum,
      ...presentation,
      ...extra,
    })
    .refine((c) => Boolean(c.entityId) !== (c.entityScope === 'ALL'), {
      message: 'set exactly one of entityId (a single entity) or entityScope: "ALL" (every entity of entityType)',
      path: ['entityId'],
    });
}

/**
 * One column of a table widget. Mirrors ThingsBoard's `dataKeys`: a column is identified by
 * where the value comes from, not by a flat key name, because an attribute named `status` and
 * a telemetry series named `status` are different things.
 *
 * `key: '*'` is a wildcard meaning "every key of this source" — for ATTRIBUTE it's scoped to
 * that one attribute scope. It's stored as a rule rather than expanded into the concrete keys
 * at save time for the same reason entityScope: 'ALL' exists: keys reported later still show
 * up without anyone reopening the editor.
 *
 * Array order is column order.
 */
const dataKey = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('ATTRIBUTE'),
    scope: z.enum(['CLIENT_SCOPE', 'SERVER_SCOPE', 'SHARED_SCOPE']),
    key: z.string().min(1),
  }),
  z.object({
    source: z.literal('TELEMETRY'),
    key: z.string().min(1),
  }),
]);

/** Widgets that are meaningful with no datasource at all (tenant-wide alarms, fleet map).
 * Everything optional, so a legacy `{}` config saved before entityScope existed still
 * validates and keeps rendering as "everything". */
function optionalDatasource<T extends z.ZodRawShape>(extra: T = {} as T) {
  return z.object({
    entityId: z.string().uuid().optional(),
    entityScope: z.literal('ALL').optional(),
    entityType: entityTypeEnum.optional(),
    ...presentation,
    ...extra,
  });
}

/** The scale a dial-style widget (gauge, battery, rssi) is read against. Optional throughout:
 * without them each widget falls back to a range that suits its own unit. */
const scale = {
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
};

const MIN_BELOW_MAX = {
  message: 'min must be less than max',
  path: ['min'],
};

function minBelowMax(c: { min?: number; max?: number }) {
  return c.min === undefined || c.max === undefined || c.min < c.max;
}

/** How a chart connects its points. `step` is what makes a discrete/state series readable —
 * a smoothed curve between two states invents values that never occurred. */
const interpolation = z.enum(['linear', 'step']).optional();

const aggregation = z.enum(['AVG', 'MIN', 'MAX', 'SUM', 'COUNT']).optional();

const alarmSeverity = z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INDETERMINATE']);
const alarmStatus = z.enum(['ACTIVE_UNACK', 'ACTIVE_ACK', 'CLEARED_UNACK', 'CLEARED_ACK']);

const widgetConfigSchemas: Record<WidgetType, z.ZodTypeAny> = {
  'value-tile': datasource({
    telemetryKey: z.string().min(1),
  }),
  // One card per entity, each showing the same set of measures — so `telemetryKeys` is a list,
  // not the single `telemetryKey` the tile/chart/gauge take.
  'value-cards': datasource({
    telemetryKeys: z.array(z.string().min(1)).min(1),
  }),
  // min/max bound the dial's sweep. Optional: without them the gauge falls back to a range
  // derived from the value itself, which is still readable, just not calibrated.
  // `style` is a rendering choice over identical data, so it lives here rather than as three
  // widget types: a dial, a thermometer and a radial bar all answer "where does this value sit
  // in its range", and splitting them would triple the gallery for one config field.
  gauge: datasource({
    telemetryKey: z.string().min(1),
    style: z.enum(['DIAL', 'THERMOMETER', 'RADIAL']).optional(),
    ...scale,
  }).refine(minBelowMax, MIN_BELOW_MAX),
  // Same config shape as the gauge — the difference is entirely in how it's drawn. Separate
  // types rather than a `style` field on the gauge so each gets its own gallery entry with the
  // right defaults (0-100 % vs a dBm range) instead of one entry that needs manual calibration.
  battery: datasource({
    telemetryKey: z.string().min(1),
    ...scale,
  }).refine(minBelowMax, MIN_BELOW_MAX),
  rssi: datasource({
    telemetryKey: z.string().min(1),
    ...scale,
  }).refine(minBelowMax, MIN_BELOW_MAX),
  'line-chart': datasource({
    telemetryKey: z.string().min(1),
    agg: aggregation,
    interval: z.number().int().positive().optional(),
    interpolation,
  }),
  'bar-chart': datasource({
    telemetryKey: z.string().min(1),
    agg: aggregation,
    interval: z.number().int().positive().optional(),
  }),
  'attributes-table': datasource({
    scope: z.enum(['CLIENT_SCOPE', 'SERVER_SCOPE', 'SHARED_SCOPE']).optional(),
    dataKeys: z.array(dataKey).optional(),
  }),
  // Rows are timestamps and columns are keys, so it takes the same key *list* as value-cards
  // rather than the single key the charts take.
  'timeseries-table': datasource({
    telemetryKeys: z.array(z.string().min(1)).min(1),
    agg: aggregation,
    interval: z.number().int().positive().optional(),
  }),
  // No `interval`: the grid is one cell per day, so the bucket size is the widget's premise
  // rather than something to configure. `agg` still matters — a day's "value" can be its
  // average, its peak, or how many readings arrived.
  'calendar-heatmap': datasource({
    telemetryKey: z.string().min(1),
    agg: aggregation,
    unit: z.string().optional(),
  }),
  /**
   * Correlation between two quantities. Either axis takes a telemetry key or the literal
   * 'TIME' — with TIME on x it degenerates into a dotted line chart, which is the honest way
   * to plot a series too sparse or irregular for a connecting line.
   *
   * `mode` decides what one dot means: HISTORY plots one entity's samples over the window
   * (does rssi track snr on this device?), FLEET plots one dot per entity at its latest
   * reading (which device sits outside the pack?). They answer different questions from the
   * same two keys, so it's a mode rather than two widget types.
   */
  scatter: datasource({
    xKey: z.string().min(1),
    yKey: z.string().min(1),
    mode: z.enum(['HISTORY', 'FLEET']).optional(),
    xUnit: z.string().optional(),
    yUnit: z.string().optional(),
  }),
  /** Composition of a countable set. Telemetry is deliberately not a source: a pie of
   * temperatures implies the slices sum to a meaningful whole, and they don't. */
  donut: optionalDatasource({
    groupBy: z.enum(['ALARM_SEVERITY', 'ALARM_STATUS', 'ENTITY_TYPE']),
    severities: z.array(alarmSeverity).optional(),
    statuses: z.array(alarmStatus).optional(),
  }),
  'alarms-list': optionalDatasource(),
  // Severities/statuses are lists because "how many alarms need attention right now" spans
  // several of each (CRITICAL + MAJOR, both ACTIVE_* states). Omitted means "no filter".
  'alarm-count': optionalDatasource({
    severities: z.array(alarmSeverity).optional(),
    statuses: z.array(alarmStatus).optional(),
  }),
  map: optionalDatasource(),
  // Colour encodes the reading, so a key is required — without one there is nothing to colour
  // by and this is just the fleet map.
  'value-map': datasource({
    telemetryKey: z.string().min(1),
    unit: z.string().optional(),
  }),
  // No telemetryKey: the heat is built from position density (where the sensor spent time),
  // and the positions come from the latitude/longitude series every mapped entity already
  // reports. Weighting the heat by another key would answer a different question than the one
  // this widget exists for.
  'movement-heatmap': datasource(),
};

/**
 * Validates a widget's config against its widgetType's schema before any Prisma write.
 * Throws BadRequestException naming the widgetType and the first invalid/missing field —
 * callers (DashboardsService) run this for every widget before opening a transaction, so
 * an invalid widget anywhere in a save request blocks the whole save (Phase 10's atomicity
 * requirement), not just that one widget.
 */
export function validateWidgetConfig(widgetType: string, config: unknown): void {
  const schema = widgetConfigSchemas[widgetType as WidgetType];
  if (!schema) {
    throw new BadRequestException(
      `Unknown widgetType: "${widgetType}". Registered types: ${WIDGET_TYPES.join(', ')}`,
    );
  }

  const result = schema.safeParse(config);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.') || '(root)';
    throw new BadRequestException(`${widgetType} widget invalid at "${field}": ${issue.message}`);
  }
}
