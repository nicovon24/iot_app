'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Dialog, DialogBody, DialogCloseButton, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useEntities } from '@/hooks/entities/useEntities';
import { useDataKeyOptions, useTelemetryKeyOptions, type DataKey } from '../../use-widget-datasource';
import type { DatasourceScope } from '../DatasourcePicker';
import type { WidgetAction } from '../widget-actions';
import { packWidgets } from '../../canvas/layout-utils';
import { WIDGET_REGISTRY, type WidgetCategory, type WidgetType } from '../widget-registry';
import { CategoryStep } from './CategoryStep';
import { GalleryStep } from './GalleryStep';
import { ConfigureStep } from './ConfigureStep';
import type { DashboardWidget } from '@/types';

export interface NewWidgetInput {
  widgetType: string;
  config: Record<string, unknown>;
  layout: DashboardWidget['layout'];
}

type Step = 'category' | 'gallery' | 'configure';

/** Shared with BulkAddPanel so both widget dialogs always render at the same size. */
export const WIDGET_DIALOG_WIDTH = 'max-w-3xl';
export const WIDGET_DIALOG_BODY_HEIGHT = 'h-[32rem]';

type Aggregation = 'AVG' | 'MIN' | 'MAX' | 'SUM' | 'COUNT';

/** Widget types whose config carries a min/max/unit scale. Mirrors the backend schemas. */
const SCALE_TYPES: WidgetType[] = ['gauge', 'battery', 'rssi'];
/** Widget types whose history query is aggregated into buckets. */
const AGGREGATED_TYPES: WidgetType[] = ['line-chart', 'bar-chart', 'timeseries-table', 'calendar-heatmap'];
/** Widget types that show a unit beside the value but have no min/max scale to calibrate. */
const UNIT_ONLY_TYPES: WidgetType[] = ['calendar-heatmap', 'value-map'];

export function AddWidgetPanel({
  isOpen,
  onClose,
  existingLayouts,
  onAdd,
  editWidget,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  existingLayouts: DashboardWidget['layout'][];
  onAdd: (widget: NewWidgetInput) => void;
  /** When set the dialog opens straight into the config step, seeded from this widget, and
   * saves back to it instead of appending a new one. */
  editWidget?: DashboardWidget | null;
  onUpdate?: (widgetKey: string, config: Record<string, unknown>) => void;
}) {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<WidgetCategory | undefined>(undefined);
  const [widgetType, setWidgetType] = useState<WidgetType | undefined>(undefined);
  const [entityKind, setEntityKind] = useState<'DEVICE' | 'ASSET'>('DEVICE');
  const [entityId, setEntityId] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<DatasourceScope>('SINGLE');
  const [telemetryKey, setTelemetryKey] = useState<string | undefined>(undefined);
  /** Used instead of `telemetryKey` by widgets whose registry entry sets multiTelemetryKeys. */
  const [telemetryKeys, setTelemetryKeys] = useState<Set<string>>(new Set());
  const [dataKeys, setDataKeys] = useState<DataKey[]>([]);
  const [title, setTitle] = useState('');
  const [action, setAction] = useState<WidgetAction>('NONE');
  const [tab, setTab] = useState<'data' | 'keys'>('data');
  // Type-specific config. Kept as strings so a half-typed "-" or "" is a valid intermediate
  // state; parsed to numbers only in buildConfig.
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [unit, setUnit] = useState('');
  const [interpolation, setInterpolation] = useState<'linear' | 'step'>('linear');
  const [agg, setAgg] = useState<Aggregation>('AVG');
  const [severities, setSeverities] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [gaugeStyle, setGaugeStyle] = useState<'DIAL' | 'THERMOMETER' | 'RADIAL'>('DIAL');
  const [xKey, setXKey] = useState<string | undefined>(undefined);
  const [yKey, setYKey] = useState<string | undefined>(undefined);
  const [xUnit, setXUnit] = useState('');
  const [yUnit, setYUnit] = useState('');
  const [scatterMode, setScatterMode] = useState<'HISTORY' | 'FLEET'>('HISTORY');
  const [groupBy, setGroupBy] = useState<'ALARM_SEVERITY' | 'ALARM_STATUS' | 'ENTITY_TYPE'>('ALARM_SEVERITY');

  const isEditing = Boolean(editWidget);
  const meta = widgetType ? WIDGET_REGISTRY[widgetType] : undefined;

  // Seed from the widget being edited. Keyed on the widget id so reopening the dialog on a
  // different widget re-seeds, while typing inside it doesn't get clobbered on every render.
  useEffect(() => {
    if (!isOpen || !editWidget) return;
    const config = editWidget.config as {
      entityId?: string;
      entityScope?: 'ALL';
      entityType?: 'DEVICE' | 'ASSET';
      telemetryKey?: string;
      telemetryKeys?: string[];
      dataKeys?: DataKey[];
      title?: string;
      action?: WidgetAction;
      min?: number;
      max?: number;
      unit?: string;
      interpolation?: 'linear' | 'step';
      agg?: Aggregation;
      severities?: string[];
      statuses?: string[];
      style?: 'DIAL' | 'THERMOMETER' | 'RADIAL';
      xKey?: string;
      yKey?: string;
      xUnit?: string;
      yUnit?: string;
      mode?: 'HISTORY' | 'FLEET';
      groupBy?: 'ALARM_SEVERITY' | 'ALARM_STATUS' | 'ENTITY_TYPE';
    };
    const type = editWidget.widgetType as WidgetType;
    setWidgetType(type);
    setCategory(WIDGET_REGISTRY[type]?.category);
    setEntityKind(config.entityType ?? 'DEVICE');
    setEntityId(config.entityId);
    setScope(config.entityScope === 'ALL' ? 'ALL' : 'SINGLE');
    setTelemetryKey(config.telemetryKey);
    setTelemetryKeys(new Set(config.telemetryKeys ?? []));
    setDataKeys(config.dataKeys ?? []);
    setTitle(config.title ?? '');
    setAction(config.action ?? 'NONE');
    setMin(config.min !== undefined ? String(config.min) : '');
    setMax(config.max !== undefined ? String(config.max) : '');
    setUnit(config.unit ?? '');
    setInterpolation(config.interpolation ?? 'linear');
    setAgg(config.agg ?? 'AVG');
    setSeverities(new Set(config.severities ?? []));
    setStatuses(new Set(config.statuses ?? []));
    setGaugeStyle(config.style ?? 'DIAL');
    setXKey(config.xKey);
    setYKey(config.yKey);
    setXUnit(config.xUnit ?? '');
    setYUnit(config.yUnit ?? '');
    setScatterMode(config.mode ?? 'HISTORY');
    setGroupBy(config.groupBy ?? 'ALARM_SEVERITY');
    setTab('data');
    setStep('configure');
  }, [isOpen, editWidget]);
  // The scatter declares telemetryKey: 'none' because its keys are per-axis, but it still needs
  // the key list to populate those two pickers.
  const needsKey = Boolean(meta && meta.telemetryKey !== 'none') || widgetType === 'scatter';
  const supportsDataKeys = Boolean(meta?.supportsDataKeys);

  // In ALL scope there's no single entity to read keys off, so the options come from a sample
  // of the fleet; in SINGLE scope it's just the one picked entity. Also doubles as the source
  // for the picked entity's name, used to preview the auto-generated title below.
  const entitiesQuery = useEntities(
    entityKind,
    { pageSize: 200 },
    { enabled: (needsKey || supportsDataKeys || meta?.entity !== 'none') && (scope === 'ALL' || Boolean(entityId)) },
  );
  const keySourceIds =
    scope === 'ALL' ? (entitiesQuery.data?.data ?? []).map((e) => e.id) : entityId ? [entityId] : [];
  const selectedEntityName = entityId
    ? entitiesQuery.data?.data.find((e) => e.id === entityId)?.name
    : undefined;

  const keyOptions = useTelemetryKeyOptions(needsKey ? keySourceIds : [], entityKind);
  const dataKeyOptions = useDataKeyOptions(supportsDataKeys ? keySourceIds : [], entityKind);

  const multiKeys = Boolean(meta?.multiTelemetryKeys);
  const entitySatisfied = !meta || meta.entity !== 'required' || scope === 'ALL' || Boolean(entityId);
  const keySatisfied =
    !meta || meta.telemetryKey !== 'required' || (multiKeys ? telemetryKeys.size > 0 : Boolean(telemetryKey));
  // The backend rejects min >= max; catching it here turns a save-time error into a disabled
  // button next to the field that caused it.
  const scaleValid =
    !min.trim() || !max.trim() || !Number.isFinite(Number(min)) || !Number.isFinite(Number(max))
      ? true
      : Number(min) < Number(max);
  // The scatter's axes bypass the generic telemetryKey field (which key goes where is the whole
  // point), so they get their own completeness check.
  const axesSatisfied = widgetType !== 'scatter' || Boolean(xKey && yKey);
  const canAdd = Boolean(meta) && entitySatisfied && keySatisfied && scaleValid && axesSatisfied;

  // Mirrors the per-type fallback titles in the renderer cells, so the placeholder shown here
  // is what the widget will actually be titled if the user leaves this blank — not a generic
  // "auto-generated" note.
  const autoTitle = (() => {
    if (!widgetType) return 'Widget title';
    switch (widgetType) {
      case 'value-tile':
        return scope === 'ALL' ? (telemetryKey ?? 'Value') : `${selectedEntityName ?? 'Entity'} · ${telemetryKey ?? 'key'}`;
      case 'gauge':
        return `${selectedEntityName ?? 'Entity'} · ${telemetryKey ?? 'key'}`;
      case 'alarms-list':
        return scope === 'SINGLE' && entityId
          ? 'Entity Alarms'
          : `All ${entityKind === 'ASSET' ? 'Asset' : 'Device'} Alarms`;
      default:
        return meta?.label ?? 'Widget title';
    }
  })();

  /** Clears everything that belongs to a specific widget type, shared by reset() and the
   * gallery pick so switching types never carries a stale scale or filter across. */
  function resetTypeConfig() {
    setEntityId(undefined);
    setTelemetryKey(undefined);
    setTelemetryKeys(new Set());
    setDataKeys([]);
    setTitle('');
    setAction('NONE');
    setMin('');
    setMax('');
    setUnit('');
    setInterpolation('linear');
    setAgg('AVG');
    setSeverities(new Set());
    setStatuses(new Set());
    setGaugeStyle('DIAL');
    setXKey(undefined);
    setYKey(undefined);
    setXUnit('');
    setYUnit('');
    setScatterMode('HISTORY');
    setGroupBy('ALARM_SEVERITY');
  }

  function reset() {
    setStep('category');
    setCategory(undefined);
    setWidgetType(undefined);
    setEntityKind('DEVICE');
    setScope('SINGLE');
    setTab('data');
    resetTypeConfig();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function pickCategory(next: WidgetCategory) {
    setCategory(next);
    setStep('gallery');
  }

  function pickWidgetType(type: WidgetType) {
    const next = WIDGET_REGISTRY[type];
    setWidgetType(type);
    setEntityKind(next.entityKinds[0]);
    // Widgets whose entity is optional (map, alarms) have always meant "everything" by
    // default; ones that require an entity default to picking a specific one.
    setScope(next.supportsAllScope && next.entity === 'optional' ? 'ALL' : 'SINGLE');
    resetTypeConfig();
    // Table widgets are useless until columns are picked, so land on that tab rather than
    // making the user discover it.
    setTab(next.supportsDataKeys ? 'keys' : 'data');
    setStep('configure');
  }

  function buildConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    if (!meta) return config;
    // entityScope and entityId are mutually exclusive on the backend schema — writing both
    // would leave the renderer guessing which one wins, so exactly one goes in.
    if (meta.entity !== 'none') {
      if (scope === 'ALL') {
        config.entityScope = 'ALL';
        config.entityType = entityKind;
      } else if (entityId) {
        config.entityId = entityId;
        config.entityType = entityKind;
      }
    }
    if (meta.telemetryKey !== 'none') {
      if (multiKeys) {
        if (telemetryKeys.size > 0) config.telemetryKeys = Array.from(telemetryKeys);
      } else if (telemetryKey) {
        config.telemetryKey = telemetryKey;
      }
    }
    // Omitted entirely when empty — the renderer reads "no dataKeys" as "every attribute",
    // which is what the widget did before columns were configurable.
    if (meta.supportsDataKeys && dataKeys.length > 0) {
      config.dataKeys = dataKeys;
    }
    // Every type-specific field below is omitted when blank/default for the same reason as the
    // title: the backend treats absent as "use the built-in fallback", and writing a default
    // explicitly would freeze it if that fallback ever changes.
    if (widgetType && SCALE_TYPES.includes(widgetType)) {
      const parsedMin = Number(min.trim());
      const parsedMax = Number(max.trim());
      if (min.trim() && Number.isFinite(parsedMin)) config.min = parsedMin;
      if (max.trim() && Number.isFinite(parsedMax)) config.max = parsedMax;
      if (unit.trim()) config.unit = unit.trim();
    }
    if (widgetType && UNIT_ONLY_TYPES.includes(widgetType) && unit.trim()) {
      config.unit = unit.trim();
    }
    if (widgetType && AGGREGATED_TYPES.includes(widgetType) && agg !== 'AVG') {
      config.agg = agg;
    }
    if (widgetType === 'line-chart' && interpolation === 'step') {
      config.interpolation = interpolation;
    }
    if (widgetType === 'alarm-count') {
      if (severities.size > 0) config.severities = Array.from(severities);
      if (statuses.size > 0) config.statuses = Array.from(statuses);
    }
    if (widgetType === 'gauge' && gaugeStyle !== 'DIAL') {
      config.style = gaugeStyle;
    }
    if (widgetType === 'scatter') {
      // Both axes are required by the schema; canAdd blocks submitting without them.
      if (xKey) config.xKey = xKey;
      if (yKey) config.yKey = yKey;
      if (scatterMode !== 'HISTORY') config.mode = scatterMode;
      if (xUnit.trim()) config.xUnit = xUnit.trim();
      if (yUnit.trim()) config.yUnit = yUnit.trim();
    }
    if (widgetType === 'donut') {
      config.groupBy = groupBy;
    }

    // Both omitted rather than written as ''/'NONE' — the backend schema treats absent as
    // "use the generated title" / "no action", and an empty string would fail its min(1).
    const trimmedTitle = title.trim();
    if (trimmedTitle) config.title = trimmedTitle;
    if (action !== 'NONE') config.action = action;
    return config;
  }

  function handleSubmit() {
    if (!widgetType || !meta) return;

    if (editWidget && onUpdate) {
      // Layout is deliberately untouched: the user placed and sized this widget already, and
      // re-packing it on a config change would move it out from under them.
      onUpdate(editWidget.id, buildConfig());
    } else {
      onAdd({
        widgetType,
        config: buildConfig(),
        layout: packWidgets(existingLayouts, [meta.defaultLayout])[0],
      });
    }
    reset();
    onClose();
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} widthClassName={WIDGET_DIALOG_WIDTH}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          {/* No way back past the gallery while editing — swapping an existing widget's type
           * would silently invalidate its config rather than "edit" it. */}
          {!isEditing && step !== 'category' && (
            <button
              type="button"
              onClick={() => setStep(step === 'configure' ? 'gallery' : 'category')}
              aria-label={step === 'configure' ? 'Back to widget list' : 'Back to categories'}
              className="text-muted transition-colors hover:text-heading"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <DialogTitle>
            {isEditing
              ? `Edit ${meta?.label ?? 'widget'}`
              : step === 'category'
                ? 'Add widget'
                : step === 'gallery'
                  ? (category ?? 'Add widget')
                  : (meta?.label ?? 'Configure widget')}
          </DialogTitle>
        </div>
        <DialogCloseButton />
      </DialogHeader>

      <DialogBody className={`${WIDGET_DIALOG_BODY_HEIGHT} overflow-y-auto`}>
        {step === 'category' && <CategoryStep onPick={pickCategory} />}

        {step === 'gallery' && category && <GalleryStep category={category} onPick={pickWidgetType} />}

        {step === 'configure' && meta && widgetType && (
          <ConfigureStep
            meta={meta}
            widgetType={widgetType}
            tab={tab}
            onTabChange={setTab}
            supportsDataKeys={supportsDataKeys}
            dataKeys={dataKeys}
            onDataKeysChange={setDataKeys}
            dataKeyOptions={dataKeyOptions}
            title={title}
            onTitleChange={setTitle}
            autoTitle={autoTitle}
            min={min}
            onMinChange={setMin}
            max={max}
            onMaxChange={setMax}
            unit={unit}
            onUnitChange={setUnit}
            scaleValid={scaleValid}
            agg={agg}
            onAggChange={setAgg}
            gaugeStyle={gaugeStyle}
            onGaugeStyleChange={setGaugeStyle}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            scatterMode={scatterMode}
            onScatterModeChange={setScatterMode}
            xKey={xKey}
            onXKeyChange={setXKey}
            yKey={yKey}
            onYKeyChange={setYKey}
            xUnit={xUnit}
            onXUnitChange={setXUnit}
            yUnit={yUnit}
            onYUnitChange={setYUnit}
            interpolation={interpolation}
            onInterpolationChange={setInterpolation}
            severities={severities}
            onSeveritiesChange={setSeverities}
            statuses={statuses}
            onStatusesChange={setStatuses}
            action={action}
            onActionChange={setAction}
            entityKind={entityKind}
            entityId={entityId}
            scope={scope}
            onScopeChange={(next) => {
              setScope(next);
              setEntityId(undefined);
              setTelemetryKey(undefined);
            }}
            onEntityKindChange={(kind) => {
              setEntityKind(kind);
              setEntityId(undefined);
              setTelemetryKey(undefined);
            }}
            onEntityIdChange={(id) => {
              setEntityId(id);
              setTelemetryKey(undefined);
            }}
            needsKey={needsKey}
            multiKeys={multiKeys}
            keyOptions={keyOptions}
            telemetryKey={telemetryKey}
            onTelemetryKeyChange={setTelemetryKey}
            telemetryKeys={telemetryKeys}
            onTelemetryKeysChange={setTelemetryKeys}
          />
        )}
      </DialogBody>

      <DialogFooter className="min-h-17 items-center justify-end">
        {step === 'configure' && meta ? (
          <button
            type="button"
            disabled={!canAdd}
            onClick={handleSubmit}
            style={{ background: 'var(--gradient-accent)' }}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEditing ? 'Save changes' : 'Add widget'}
          </button>
        ) : (
          <span className="text-xs text-muted">Choose a widget type to continue</span>
        )}
      </DialogFooter>
    </Dialog>
  );
}
