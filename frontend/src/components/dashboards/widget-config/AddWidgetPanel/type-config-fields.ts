import type { WidgetType } from '../widget-registry';

/**
 * Declarative table for the widget-config fields that are "one state, one control, no cross-field
 * dependency" — everything EXCEPT unit/decimals (auto-suggest + touched-tracking),
 * telemetryKey/telemetryKeys (drives auto-suggest, resets on entity change), entityId/scope/
 * entityKind (reset each other), unitsByKey (keyed per telemetry key), min/max (cross-validated),
 * and title/action/dataKeys (always-present, type-independent). Those keep their own explicit
 * useState/seed/reset/build in AddWidgetPanel/index.tsx — folding cross-field logic into a generic
 * table would obscure it, not simplify it.
 *
 * Adding a widget type field that fits this shape means one entry here instead of touching
 * useState/seed/resetTypeConfig/buildConfig by hand in four places.
 */
export interface FieldSpec<V = unknown> {
  key: string;
  default: V;
  /** Reads the saved value back out of `DashboardWidget.config` when editing. */
  fromConfig: (config: Record<string, unknown>) => V;
  /** Whether this type instance should write to config (e.g. only when non-default, or only in
   * a particular scope) — mirrors what buildConfig's per-field `if` used to check. */
  shouldSave: (value: V, ctx: { scope: 'SINGLE' | 'ALL' }) => boolean;
  /** Config key(s) this field writes. Usually just `[key]`, but scatterMode maps state `scatterMode`
   * to config key `mode`. */
  toConfig: (value: V) => Record<string, unknown>;
}

function field<V>(spec: FieldSpec<V>): FieldSpec<V> {
  return spec;
}

const AGGREGATED_TYPES: WidgetType[] = ['line-chart', 'bar-chart', 'timeseries-table', 'calendar-heatmap'];

/** Field specs, keyed by widget type. A field only appears for the types it actually applies to —
 * ConfigureStep still decides whether to *render* the control (that's a UI-layout concern), this
 * table only owns state lifecycle + config serialization. */
export const TYPE_CONFIG_FIELDS: Partial<Record<WidgetType, FieldSpec<any>[]>> = {};

for (const t of AGGREGATED_TYPES) {
  TYPE_CONFIG_FIELDS[t] = [
    ...(TYPE_CONFIG_FIELDS[t] ?? []),
    field<'AVG' | 'MIN' | 'MAX' | 'SUM' | 'COUNT'>({
      key: 'agg',
      default: 'AVG',
      fromConfig: (c) => (c.agg as any) ?? 'AVG',
      shouldSave: (v) => v !== 'AVG',
      toConfig: (v) => ({ agg: v }),
    }),
  ];
}

TYPE_CONFIG_FIELDS.gauge = [
  ...(TYPE_CONFIG_FIELDS.gauge ?? []),
  field<'DIAL' | 'THERMOMETER' | 'RADIAL' | 'BAR'>({
    key: 'gaugeStyle',
    default: 'DIAL',
    fromConfig: (c) => (c.style as any) ?? 'DIAL',
    shouldSave: (v) => v !== 'DIAL',
    toConfig: (v) => ({ style: v }),
  }),
];

TYPE_CONFIG_FIELDS.donut = [
  field<'ALARM_SEVERITY' | 'ALARM_STATUS' | 'ENTITY_TYPE'>({
    key: 'groupBy',
    default: 'ALARM_SEVERITY',
    fromConfig: (c) => (c.groupBy as any) ?? 'ALARM_SEVERITY',
    shouldSave: () => true,
    toConfig: (v) => ({ groupBy: v }),
  }),
];

TYPE_CONFIG_FIELDS.scatter = [
  field<'HISTORY' | 'FLEET'>({
    key: 'scatterMode',
    default: 'HISTORY',
    fromConfig: (c) => (c.mode as any) ?? 'HISTORY',
    shouldSave: (v) => v !== 'HISTORY',
    toConfig: (v) => ({ mode: v }),
  }),
  field<string>({
    key: 'xUnit',
    default: '',
    fromConfig: (c) => (c.xUnit as string) ?? '',
    shouldSave: (v) => v.trim().length > 0,
    toConfig: (v) => ({ xUnit: v.trim() }),
  }),
  field<string>({
    key: 'yUnit',
    default: '',
    fromConfig: (c) => (c.yUnit as string) ?? '',
    shouldSave: (v) => v.trim().length > 0,
    toConfig: (v) => ({ yUnit: v.trim() }),
  }),
];

TYPE_CONFIG_FIELDS['line-chart'] = [
  ...(TYPE_CONFIG_FIELDS['line-chart'] ?? []),
  field<'linear' | 'step'>({
    key: 'interpolation',
    default: 'linear',
    fromConfig: (c) => (c.interpolation as any) ?? 'linear',
    shouldSave: (v) => v === 'step',
    toConfig: (v) => ({ interpolation: v }),
  }),
];

TYPE_CONFIG_FIELDS['bar-chart'] = [
  ...(TYPE_CONFIG_FIELDS['bar-chart'] ?? []),
  field<boolean>({
    key: 'stacked',
    default: false,
    fromConfig: (c) => Boolean(c.stacked),
    shouldSave: (v, ctx) => v && ctx.scope === 'ALL',
    toConfig: () => ({ stacked: true }),
  }),
];

TYPE_CONFIG_FIELDS['value-tile'] = [
  field<boolean>({
    key: 'sparkline',
    default: false,
    fromConfig: (c) => Boolean(c.sparkline),
    shouldSave: (v, ctx) => v && ctx.scope === 'SINGLE',
    toConfig: () => ({ sparkline: true }),
  }),
];

TYPE_CONFIG_FIELDS['alarm-count'] = [
  field<Set<string>>({
    key: 'severities',
    default: new Set<string>(),
    fromConfig: (c) => new Set((c.severities as string[]) ?? []),
    shouldSave: (v) => v.size > 0,
    toConfig: (v) => ({ severities: Array.from(v) }),
  }),
  field<Set<string>>({
    key: 'statuses',
    default: new Set<string>(),
    fromConfig: (c) => new Set((c.statuses as string[]) ?? []),
    shouldSave: (v) => v.size > 0,
    toConfig: (v) => ({ statuses: Array.from(v) }),
  }),
];

TYPE_CONFIG_FIELDS.label = [
  field<string>({
    key: 'text',
    default: '',
    fromConfig: (c) => (c.text as string) ?? '',
    shouldSave: (v) => v.trim().length > 0,
    toConfig: (v) => ({ text: v.trim() }),
  }),
  field<'left' | 'center'>({
    key: 'align',
    default: 'left',
    fromConfig: (c) => (c.align as any) ?? 'left',
    shouldSave: (v) => v !== 'left',
    toConfig: (v) => ({ align: v }),
  }),
];

TYPE_CONFIG_FIELDS.scatter = [
  ...(TYPE_CONFIG_FIELDS.scatter ?? []),
  field<string | undefined>({
    key: 'xKey',
    default: undefined,
    fromConfig: (c) => c.xKey as string | undefined,
    shouldSave: (v) => Boolean(v),
    toConfig: (v) => (v ? { xKey: v } : {}),
  }),
  field<string | undefined>({
    key: 'yKey',
    default: undefined,
    fromConfig: (c) => c.yKey as string | undefined,
    shouldSave: (v) => Boolean(v),
    toConfig: (v) => (v ? { yKey: v } : {}),
  }),
];
