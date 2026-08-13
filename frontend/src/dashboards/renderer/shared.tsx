import type { GaugeStyle } from '@/widgets/charts/GaugeWidget';
import type { WidgetAction } from '../widget-config/widget-actions';
import type { DataKey, WidgetDatasource } from '../use-widget-datasource';
import type { AlarmSeverity, AlarmStatus } from '@/types';

/**
 * Per-widget caps on how many entities an ALL-scope widget actually renders.
 *
 * The line chart's cap is a hard design constraint, not a performance guess: the categorical
 * palette is eight validated slots and a ninth series would have to invent a hue or reuse one,
 * either of which breaks colorblind separation. The tile/row caps are about request volume —
 * each entity costs its own telemetry/attribute request — and about the display staying
 * readable. In every case the widget reports how many entities it left out rather than
 * silently truncating.
 */
export const MAX_TILES = 24;
export const MAX_ROWS = 20;
export const MAX_CARDS = 24;

export const ENTITY_POLL_MS = 60_000;

export function WidgetUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="glass-card flex h-full min-h-24 items-center justify-center p-4 text-center">
      <p className="text-sm text-muted">{reason ?? 'Entity unavailable — it may have been deleted'}</p>
    </div>
  );
}

export interface EntityWidgetConfig extends WidgetDatasource {
  telemetryKey?: string;
  agg?: 'AVG' | 'MIN' | 'MAX' | 'SUM' | 'COUNT';
  interval?: number;
  /** Value Cards — the measures shown on every card. */
  telemetryKeys?: string[];
  /** Gauge, battery, rssi — dial calibration. */
  min?: number;
  max?: number;
  unit?: string;
  /** Gauge — which of the three renderings to use. */
  style?: GaugeStyle;
  /** Scatter — the two axes, either a telemetry key or the literal 'TIME'. */
  xKey?: string;
  yKey?: string;
  mode?: 'HISTORY' | 'FLEET';
  xUnit?: string;
  yUnit?: string;
  /** Donut — what the slices count. */
  groupBy?: 'ALARM_SEVERITY' | 'ALARM_STATUS' | 'ENTITY_TYPE';
  /** Line chart — how the series is connected between points. */
  interpolation?: 'linear' | 'step';
  /** Table widgets only — which attribute/telemetry keys become columns. */
  dataKeys?: DataKey[];
  /** Alarm count — which alarms are counted. Empty/absent means no filter on that dimension. */
  severities?: AlarmSeverity[];
  statuses?: AlarmStatus[];
  /** Overrides the title each cell would otherwise generate from entity + key. */
  title?: string;
  action?: WidgetAction;
}
