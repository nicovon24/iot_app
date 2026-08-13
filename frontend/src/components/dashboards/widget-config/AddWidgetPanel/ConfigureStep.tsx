'use client';

import { Select } from '@/components';
import { Input, Checkbox } from '@/components';
import { DatasourcePicker, type DatasourceScope, DataKeysPicker, CheckboxList, UnitPicker } from '../pickers';
import type { DataKey } from '../../use-widget-datasource';
import type { WidgetAction } from '../widget-actions';
import { SCALE_TYPES, type WidgetTypeMeta, type WidgetType } from '../widget-registry';

type Aggregation = 'AVG' | 'MIN' | 'MAX' | 'SUM' | 'COUNT';

/** Widget types whose history query is aggregated into buckets. */
const AGGREGATED_TYPES: WidgetType[] = ['line-chart', 'bar-chart', 'timeseries-table', 'calendar-heatmap'];

/** Placeholders showing what each dial falls back to when its scale is left blank —
 * mirrors DIAL_DEFAULTS in renderer/CardCells. */
const SCALE_PLACEHOLDERS: Partial<Record<WidgetType, { min: string; max: string; unit: string }>> = {
  battery: { min: '0', max: '100', unit: '%' },
  rssi: { min: '-120', max: '-30', unit: 'dBm' },
  gauge: { min: 'Auto', max: 'Auto', unit: 'none' },
};

const SEVERITY_OPTIONS = ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INDETERMINATE'];
const STATUS_OPTIONS = ['ACTIVE_UNACK', 'ACTIVE_ACK', 'CLEARED_UNACK', 'CLEARED_ACK'];

export interface ConfigureStepProps {
  meta: WidgetTypeMeta;
  widgetType: WidgetType;
  tab: 'data' | 'keys';
  onTabChange: (tab: 'data' | 'keys') => void;
  supportsDataKeys: boolean;

  dataKeys: DataKey[];
  onDataKeysChange: (keys: DataKey[]) => void;
  dataKeyOptions: ReturnType<typeof import('../../use-widget-datasource').useDataKeyOptions>;

  title: string;
  onTitleChange: (title: string) => void;
  autoTitle: string;

  min: string;
  onMinChange: (v: string) => void;
  max: string;
  onMaxChange: (v: string) => void;
  unit: string;
  onUnitChange: (v: string) => void;
  decimals: string;
  onDecimalsChange: (v: string) => void;
  scaleValid: boolean;

  agg: Aggregation;
  onAggChange: (v: Aggregation) => void;

  gaugeStyle: 'DIAL' | 'THERMOMETER' | 'RADIAL' | 'BAR';
  onGaugeStyleChange: (v: 'DIAL' | 'THERMOMETER' | 'RADIAL' | 'BAR') => void;

  groupBy: 'ALARM_SEVERITY' | 'ALARM_STATUS' | 'ENTITY_TYPE';
  onGroupByChange: (v: 'ALARM_SEVERITY' | 'ALARM_STATUS' | 'ENTITY_TYPE') => void;

  scatterMode: 'HISTORY' | 'FLEET';
  onScatterModeChange: (v: 'HISTORY' | 'FLEET') => void;
  xKey: string | undefined;
  onXKeyChange: (v: string | undefined) => void;
  yKey: string | undefined;
  onYKeyChange: (v: string | undefined) => void;
  xUnit: string;
  onXUnitChange: (v: string) => void;
  yUnit: string;
  onYUnitChange: (v: string) => void;

  interpolation: 'linear' | 'step';
  onInterpolationChange: (v: 'linear' | 'step') => void;

  severities: Set<string>;
  onSeveritiesChange: (v: Set<string>) => void;
  statuses: Set<string>;
  onStatusesChange: (v: Set<string>) => void;

  action: WidgetAction;
  onActionChange: (v: WidgetAction) => void;

  entityKind: 'DEVICE' | 'ASSET';
  entityId: string | undefined;
  scope: DatasourceScope;
  onScopeChange: (next: DatasourceScope) => void;
  onEntityKindChange: (kind: 'DEVICE' | 'ASSET') => void;
  onEntityIdChange: (id: string | undefined) => void;

  needsKey: boolean;
  multiKeys: boolean;
  keyOptions: ReturnType<typeof import('../../use-widget-datasource').useTelemetryKeyOptions>;
  telemetryKey: string | undefined;
  onTelemetryKeyChange: (v: string | undefined) => void;
  telemetryKeys: Set<string>;
  onTelemetryKeysChange: (v: Set<string>) => void;

  text: string;
  onTextChange: (v: string) => void;
  align: 'left' | 'center';
  onAlignChange: (v: 'left' | 'center') => void;

  stacked: boolean;
  onStackedChange: (v: boolean) => void;
  sparkline: boolean;
  onSparklineChange: (v: boolean) => void;

  unitsByKey: Record<string, string>;
  onUnitsByKeyChange: (key: string, unit: string) => void;
}

export function ConfigureStep(props: ConfigureStepProps) {
  const { meta, widgetType, tab, onTabChange, supportsDataKeys } = props;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 border-b border-border pb-0">
        <TabButton active={tab === 'data'} onClick={() => onTabChange('data')} label="Data" />
        {supportsDataKeys && (
          <TabButton active={tab === 'keys'} onClick={() => onTabChange('keys')} label="Columns" />
        )}
      </div>

      {tab === 'keys' && supportsDataKeys && (
        <DataKeysPicker
          value={props.dataKeys}
          onChange={props.onDataKeysChange}
          attributeKeys={props.dataKeyOptions.attributeKeys}
          telemetryKeys={props.dataKeyOptions.telemetryKeys}
          isLoading={props.dataKeyOptions.isLoading}
        />
      )}

      {tab === 'data' && (
        <Input
          label="Title"
          value={props.title}
          onChange={(e) => props.onTitleChange(e.target.value)}
          maxLength={120}
          placeholder={props.autoTitle}
        />
      )}

      {tab === 'data' && SCALE_TYPES.includes(widgetType) && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min"
              value={props.min}
              onChange={(e) => props.onMinChange(e.target.value)}
              inputMode="numeric"
              placeholder={SCALE_PLACEHOLDERS[widgetType]?.min}
            />
            <Input
              label="Max"
              value={props.max}
              onChange={(e) => props.onMaxChange(e.target.value)}
              inputMode="numeric"
              placeholder={SCALE_PLACEHOLDERS[widgetType]?.max}
            />
          </div>
          <UnitPicker
            value={props.unit}
            onChange={props.onUnitChange}
            decimals={props.decimals}
            onDecimalsChange={props.onDecimalsChange}
          />
          {!props.scaleValid && <span className="text-xs text-danger">Min must be less than max.</span>}
        </div>
      )}

      {tab === 'data' && meta.telemetryKey !== 'none' && !SCALE_TYPES.includes(widgetType) && (
        <UnitPicker
          value={props.unit}
          onChange={props.onUnitChange}
          decimals={props.decimals}
          onDecimalsChange={props.onDecimalsChange}
        />
      )}

      {tab === 'data' && widgetType === 'bar-chart' && props.scope === 'ALL' && (
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm text-body">
            <Checkbox checked={props.stacked} onChange={(e) => props.onStackedChange(e.target.checked)} />
            Stack bars
          </label>
          <span className="text-xs text-faint">
            Only meaningful for additive measures — energy, volume, counts.
          </span>
        </div>
      )}

      {tab === 'data' && widgetType === 'value-tile' && props.scope === 'SINGLE' && (
        <label className="flex items-center gap-2 text-sm text-body">
          <Checkbox checked={props.sparkline} onChange={(e) => props.onSparklineChange(e.target.checked)} />
          Sparkline
        </label>
      )}

      {tab === 'data' && AGGREGATED_TYPES.includes(widgetType) && (
        <Select
          label="Aggregation"
          value={props.agg}
          onChange={(v) => props.onAggChange(v as Aggregation)}
          options={[
            { value: 'AVG', label: 'Average' },
            { value: 'MIN', label: 'Minimum' },
            { value: 'MAX', label: 'Maximum' },
            { value: 'SUM', label: 'Sum' },
            { value: 'COUNT', label: 'Count' },
          ]}
        />
      )}

      {tab === 'data' && widgetType === 'gauge' && (
        <Select
          label="Gauge style"
          value={props.gaugeStyle}
          onChange={(v) => props.onGaugeStyleChange(v as ConfigureStepProps['gaugeStyle'])}
          options={[
            { value: 'DIAL', label: 'Dial — needle and scale' },
            { value: 'THERMOMETER', label: 'Thermometer — vertical column' },
            { value: 'RADIAL', label: 'Radial bar — compact ring' },
            { value: 'BAR', label: 'Progress bar — horizontal fill' },
          ]}
        />
      )}

      {tab === 'data' && widgetType === 'donut' && (
        <Select
          label="Count by"
          value={props.groupBy}
          onChange={(v) => props.onGroupByChange(v as ConfigureStepProps['groupBy'])}
          options={[
            { value: 'ALARM_SEVERITY', label: 'Alarms by severity' },
            { value: 'ALARM_STATUS', label: 'Alarms by status' },
            { value: 'ENTITY_TYPE', label: 'Devices vs assets' },
          ]}
        />
      )}

      {tab === 'data' && widgetType === 'scatter' && (
        <>
          <Select
            label="Compare"
            value={props.scatterMode}
            onChange={(v) => props.onScatterModeChange(v as ConfigureStepProps['scatterMode'])}
            options={[
              { value: 'HISTORY', label: 'Over time — a dot per sample, a colour per entity' },
              { value: 'FLEET', label: 'Across entities — a dot per entity, latest value' },
            ]}
          />
          <Select
            label="X axis"
            placeholder={props.keyOptions.isLoading ? 'Loading keys…' : 'Select key'}
            value={props.xKey}
            onChange={props.onXKeyChange}
            // Time is offered on x in both modes — plotted over time in HISTORY, and as
            // "when did this entity last report" in FLEET, which is how a silent sensor
            // shows up. Never on y: time on the vertical axis reads as a misconfiguration
            // in every charting convention.
            options={[
              {
                value: 'TIME',
                label: props.scatterMode === 'HISTORY' ? 'Time' : 'Time — last report',
              },
              ...props.keyOptions.keys.map((k) => ({ value: k, label: k })),
            ]}
          />
          <Select
            label="Y axis"
            placeholder={props.keyOptions.isLoading ? 'Loading keys…' : 'Select key'}
            value={props.yKey}
            onChange={props.onYKeyChange}
            options={props.keyOptions.keys.map((k) => ({ value: k, label: k }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <UnitPicker value={props.xUnit} onChange={props.onXUnitChange} showDecimals={false} />
            <UnitPicker value={props.yUnit} onChange={props.onYUnitChange} showDecimals={false} />
          </div>
        </>
      )}

      {tab === 'data' && widgetType === 'line-chart' && (
        <Select
          label="Line style"
          value={props.interpolation}
          onChange={(v) => props.onInterpolationChange(v as 'linear' | 'step')}
          options={[
            { value: 'linear', label: 'Smooth — continuous readings' },
            { value: 'step', label: 'Step — discrete states' },
          ]}
        />
      )}

      {tab === 'data' && widgetType === 'alarm-count' && (
        <>
          <CheckboxList
            label="Severities"
            items={SEVERITY_OPTIONS.map((s) => ({ value: s, label: s }))}
            selected={props.severities}
            onChange={props.onSeveritiesChange}
            emptyLabel="No severities"
            maxHeightClassName="max-h-40"
          />
          <CheckboxList
            label="Statuses"
            items={STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace('_', ' · ') }))}
            selected={props.statuses}
            onChange={props.onStatusesChange}
            emptyLabel="No statuses"
            maxHeightClassName="max-h-40"
          />
          <p className="text-xs text-faint">Leave a list empty to count every value of that kind.</p>
        </>
      )}

      {tab === 'data' && meta.entity !== 'none' && (
        <Select
          label="On click"
          value={props.action}
          onChange={(v) => props.onActionChange(v as WidgetAction)}
          options={[
            { value: 'NONE', label: 'Do nothing' },
            { value: 'ENTITY_DETAILS', label: 'Open entity details' },
          ]}
        />
      )}

      {tab === 'data' &&
        (meta.entity === 'none' ? (
          widgetType === 'label' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-body">Text</span>
                <textarea
                  value={props.text}
                  onChange={(e) => props.onTextChange(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading outline-none transition-colors placeholder:text-muted focus:border-accent"
                  placeholder="Section: Pump Station 3"
                />
              </div>
              <Select
                label="Alignment"
                value={props.align}
                onChange={(v) => props.onAlignChange(v as 'left' | 'center')}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                ]}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">This widget needs no further configuration.</p>
          )
        ) : (
          <DatasourcePicker
            requirement={meta.entity}
            entityKinds={meta.entityKinds}
            supportsAllScope={meta.supportsAllScope}
            entityKind={props.entityKind}
            entityId={props.entityId}
            scope={props.scope}
            onScopeChange={props.onScopeChange}
            onEntityKindChange={props.onEntityKindChange}
            onEntityIdChange={props.onEntityIdChange}
          />
        ))}

      {tab === 'data' &&
        props.needsKey &&
        (props.scope === 'ALL' || props.entityId) &&
        (props.multiKeys ? (
          <CheckboxList
            label="Telemetry keys"
            items={props.keyOptions.keys.map((k) => ({ value: k, label: k }))}
            selected={props.telemetryKeys}
            onChange={props.onTelemetryKeysChange}
            searchable
            searchPlaceholder="Search keys…"
            emptyLabel={props.keyOptions.isLoading ? 'Loading keys…' : 'No telemetry keys reported yet'}
            maxHeightClassName="max-h-52"
          />
        ) : (
          <Select
            label="Telemetry key"
            placeholder={props.keyOptions.isLoading ? 'Loading keys…' : 'Select key'}
            value={props.telemetryKey}
            onChange={props.onTelemetryKeyChange}
            options={props.keyOptions.keys.map((k) => ({ value: k, label: k }))}
          />
        ))}

      {tab === 'data' && meta.multiTelemetryKeys && meta.telemetryKey === 'none' && props.telemetryKeys.size > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-body">Units</span>
          {Array.from(props.telemetryKeys).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-xs text-muted" title={key}>
                {key}
              </span>
              <div className="flex-1">
                <UnitPicker
                  value={props.unitsByKey[key] ?? ''}
                  onChange={(v) => props.onUnitsByKeyChange(key, v)}
                  showDecimals={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 pb-2 text-xs font-semibold transition-colors ${
        active ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-body'
      }`}
    >
      {label}
    </button>
  );
}
