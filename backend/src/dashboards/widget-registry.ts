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
  'line-chart',
  'attributes-table',
  'alarms-list',
  'map',
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
const optionalDatasource = z.object({
  entityId: z.string().uuid().optional(),
  entityScope: z.literal('ALL').optional(),
  entityType: entityTypeEnum.optional(),
  ...presentation,
});

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
  gauge: datasource({
    telemetryKey: z.string().min(1),
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.string().optional(),
  }).refine((c) => c.min === undefined || c.max === undefined || c.min < c.max, {
    message: 'min must be less than max',
    path: ['min'],
  }),
  'line-chart': datasource({
    telemetryKey: z.string().min(1),
    agg: z.enum(['AVG', 'MIN', 'MAX', 'SUM', 'COUNT']).optional(),
    interval: z.number().int().positive().optional(),
  }),
  'attributes-table': datasource({
    scope: z.enum(['CLIENT_SCOPE', 'SERVER_SCOPE', 'SHARED_SCOPE']).optional(),
    dataKeys: z.array(dataKey).optional(),
  }),
  'alarms-list': optionalDatasource,
  map: optionalDatasource,
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
