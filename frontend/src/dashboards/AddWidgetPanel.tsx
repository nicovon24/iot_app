'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogBody, DialogCloseButton, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useEntities } from '@/hooks/useEntities';
import { DatasourcePicker, type DatasourceScope } from './DatasourcePicker';
import { DataKeysPicker } from './DataKeysPicker';
import { CheckboxList } from './CheckboxList';
import { useDataKeyOptions, useTelemetryKeyOptions, type DataKey } from './use-widget-datasource';
import type { WidgetAction } from './widget-actions';
import { packWidgets } from './layout-utils';
import { WIDGET_REGISTRY, widgetsByCategory, type WidgetType } from './widget-registry';
import type { DashboardWidget } from '@/types';

export interface NewWidgetInput {
  widgetType: string;
  config: Record<string, unknown>;
  layout: DashboardWidget['layout'];
}

type Step = 'gallery' | 'configure';

/** Shared with BulkAddPanel so both widget dialogs always render at the same size. */
export const WIDGET_DIALOG_WIDTH = 'max-w-3xl';
export const WIDGET_DIALOG_BODY_HEIGHT = 'h-[32rem]';

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
  const [step, setStep] = useState<Step>('gallery');
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
    };
    setWidgetType(editWidget.widgetType as WidgetType);
    setEntityKind(config.entityType ?? 'DEVICE');
    setEntityId(config.entityId);
    setScope(config.entityScope === 'ALL' ? 'ALL' : 'SINGLE');
    setTelemetryKey(config.telemetryKey);
    setTelemetryKeys(new Set(config.telemetryKeys ?? []));
    setDataKeys(config.dataKeys ?? []);
    setTitle(config.title ?? '');
    setAction(config.action ?? 'NONE');
    setTab('data');
    setStep('configure');
  }, [isOpen, editWidget]);
  const needsKey = Boolean(meta && meta.telemetryKey !== 'none');
  const supportsDataKeys = Boolean(meta?.supportsDataKeys);

  // In ALL scope there's no single entity to read keys off, so the options come from a sample
  // of the fleet; in SINGLE scope it's just the one picked entity.
  const entitiesQuery = useEntities(
    entityKind,
    { pageSize: 200 },
    { enabled: (needsKey || supportsDataKeys) && scope === 'ALL' },
  );
  const keySourceIds =
    scope === 'ALL' ? (entitiesQuery.data?.data ?? []).map((e) => e.id) : entityId ? [entityId] : [];

  const keyOptions = useTelemetryKeyOptions(needsKey ? keySourceIds : [], entityKind);
  const dataKeyOptions = useDataKeyOptions(supportsDataKeys ? keySourceIds : [], entityKind);

  const multiKeys = Boolean(meta?.multiTelemetryKeys);
  const entitySatisfied = !meta || meta.entity !== 'required' || scope === 'ALL' || Boolean(entityId);
  const keySatisfied =
    !meta || meta.telemetryKey !== 'required' || (multiKeys ? telemetryKeys.size > 0 : Boolean(telemetryKey));
  const canAdd = Boolean(meta) && entitySatisfied && keySatisfied;

  function reset() {
    setStep('gallery');
    setWidgetType(undefined);
    setEntityKind('DEVICE');
    setEntityId(undefined);
    setScope('SINGLE');
    setTelemetryKey(undefined);
    setTelemetryKeys(new Set());
    setDataKeys([]);
    setTitle('');
    setAction('NONE');
    setTab('data');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function pickWidgetType(type: WidgetType) {
    const next = WIDGET_REGISTRY[type];
    setWidgetType(type);
    setEntityKind(next.entityKinds[0]);
    setEntityId(undefined);
    // Widgets whose entity is optional (map, alarms) have always meant "everything" by
    // default; ones that require an entity default to picking a specific one.
    setScope(next.supportsAllScope && next.entity === 'optional' ? 'ALL' : 'SINGLE');
    setTelemetryKey(undefined);
    setTelemetryKeys(new Set());
    setDataKeys([]);
    setTitle('');
    setAction('NONE');
    setTab('data');
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
          {/* No way back to the gallery while editing — swapping an existing widget's type
           * would silently invalidate its config rather than "edit" it. */}
          {step === 'configure' && !isEditing && (
            <button
              type="button"
              onClick={() => setStep('gallery')}
              aria-label="Back to widget gallery"
              className="text-muted transition-colors hover:text-heading"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <DialogTitle>
            {isEditing
              ? `Edit ${meta?.label ?? 'widget'}`
              : step === 'gallery'
                ? 'Add widget'
                : (meta?.label ?? 'Configure widget')}
          </DialogTitle>
        </div>
        <DialogCloseButton />
      </DialogHeader>

      <DialogBody className={`${WIDGET_DIALOG_BODY_HEIGHT} overflow-y-auto`}>
        {step === 'gallery' && (
          <div className="flex flex-col gap-6">
            {widgetsByCategory().map(({ category, types }) => (
              <div key={category} className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{category}</span>
                <div className="grid grid-cols-3 gap-3">
                  {types.map((type) => {
                    const m = WIDGET_REGISTRY[type];
                    const Icon = m.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => pickWidgetType(type)}
                        className="flex flex-col items-start gap-2 rounded-md border border-border p-4 text-left transition-colors hover:border-accent hover:bg-surface"
                      >
                        <Icon size={22} className="text-accent" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-heading">{m.label}</span>
                          <span className="text-xs text-muted">{m.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 'configure' && meta && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-1 border-b border-border pb-0">
              <TabButton active={tab === 'data'} onClick={() => setTab('data')} label="Data" />
              {supportsDataKeys && (
                <TabButton active={tab === 'keys'} onClick={() => setTab('keys')} label="Columns" />
              )}
            </div>

            {tab === 'keys' && supportsDataKeys && (
              <DataKeysPicker
                value={dataKeys}
                onChange={setDataKeys}
                attributeKeys={dataKeyOptions.attributeKeys}
                telemetryKeys={dataKeyOptions.telemetryKeys}
                isLoading={dataKeyOptions.isLoading}
              />
            )}

            {tab === 'data' && (
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Auto — generated from entity and key"
              />
            )}

            {tab === 'data' && meta.entity !== 'none' && (
              <Select
                label="On click"
                value={action}
                onChange={(v) => setAction(v as WidgetAction)}
                options={[
                  { value: 'NONE', label: 'Do nothing' },
                  { value: 'ENTITY_DETAILS', label: 'Open entity details' },
                ]}
              />
            )}

            {tab === 'data' && (meta.entity === 'none' ? (
              <p className="text-sm text-muted">This widget needs no further configuration.</p>
            ) : (
              <DatasourcePicker
                requirement={meta.entity}
                entityKinds={meta.entityKinds}
                supportsAllScope={meta.supportsAllScope}
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
              />
            ))}

            {tab === 'data' && needsKey && (scope === 'ALL' || entityId) && (
              multiKeys ? (
                <CheckboxList
                  label="Telemetry keys"
                  items={keyOptions.keys.map((k) => ({ value: k, label: k }))}
                  selected={telemetryKeys}
                  onChange={setTelemetryKeys}
                  searchable
                  searchPlaceholder="Search keys…"
                  emptyLabel={keyOptions.isLoading ? 'Loading keys…' : 'No telemetry keys reported yet'}
                  maxHeightClassName="max-h-52"
                />
              ) : (
                <Select
                  label="Telemetry key"
                  placeholder={keyOptions.isLoading ? 'Loading keys…' : 'Select key'}
                  value={telemetryKey}
                  onChange={setTelemetryKey}
                  options={keyOptions.keys.map((k) => ({ value: k, label: k }))}
                />
              )
            )}
          </div>
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
