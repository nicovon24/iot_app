'use client';

import { useMemo, useState } from 'react';
import { Select } from '@/components';
import { Dialog, DialogBody, DialogCloseButton, DialogFooter, DialogHeader, DialogTitle } from '@/components';
import { useEntities } from '@/hooks';
import { CheckboxList } from './pickers';
import { WIDGET_DIALOG_BODY_HEIGHT, WIDGET_DIALOG_WIDTH } from './AddWidgetPanel';
import { useTelemetryKeyOptions } from '../use-widget-datasource';
import { packWidgets } from '../canvas/layout-utils';
import { BULK_WIDGET_TYPES, WIDGET_REGISTRY, type WidgetType } from './widget-registry';
import type { NewWidgetInput } from './AddWidgetPanel';
import type { DashboardWidgetLayout } from '@/types';

export function BulkAddPanel({
  isOpen,
  onClose,
  existingLayouts,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  existingLayouts: DashboardWidgetLayout[];
  onAdd: (widgets: NewWidgetInput[]) => void;
}) {
  const [entityKind, setEntityKind] = useState<'DEVICE' | 'ASSET'>('DEVICE');
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [widgetType, setWidgetType] = useState<WidgetType>(BULK_WIDGET_TYPES[0]);

  const entitiesQuery = useEntities(entityKind, { pageSize: 200 });
  const entities = useMemo(() => entitiesQuery.data?.data ?? [], [entitiesQuery.data]);
  const entityIds = useMemo(() => Array.from(selectedEntities), [selectedEntities]);
  // Infinity: bulk-add needs per-entity keys for *every* checked entity, not a sample, because
  // keysByEntity decides which (entity, key) widgets actually get created.
  const { keysByEntity, keys: allKeys, isLoading: keysLoading } = useTelemetryKeyOptions(entityIds, entityKind, Infinity);

  // One widget per (entity, key) pair the entity actually reports.
  const pairs = useMemo(
    () =>
      entityIds.flatMap((entityId) =>
        Array.from(selectedKeys)
          .filter((key) => keysByEntity[entityId]?.includes(key))
          .map((telemetryKey) => ({ entityId, telemetryKey })),
      ),
    [entityIds, selectedKeys, keysByEntity],
  );

  function reset() {
    setEntityKind('DEVICE');
    setSelectedEntities(new Set());
    setSelectedKeys(new Set());
    setWidgetType(BULK_WIDGET_TYPES[0]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAdd() {
    const meta = WIDGET_REGISTRY[widgetType];
    const layouts = packWidgets(
      existingLayouts,
      pairs.map(() => meta.defaultLayout),
    );

    onAdd(
      pairs.map((pair, i) => ({
        widgetType,
        config: { entityId: pair.entityId, entityType: entityKind, telemetryKey: pair.telemetryKey },
        layout: layouts[i],
      })),
    );
    reset();
    onClose();
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} widthClassName={WIDGET_DIALOG_WIDTH}>
      <DialogHeader>
        <DialogTitle>Bulk add</DialogTitle>
        <DialogCloseButton />
      </DialogHeader>

      <DialogBody className={`${WIDGET_DIALOG_BODY_HEIGHT} overflow-y-auto`}>
        <div className="flex flex-col gap-5">
          <Select
            label="Entity type"
            value={entityKind}
            onChange={(v) => {
              setEntityKind(v as 'DEVICE' | 'ASSET');
              setSelectedEntities(new Set());
              setSelectedKeys(new Set());
            }}
            options={[
              { value: 'DEVICE', label: 'Device' },
              { value: 'ASSET', label: 'Asset' },
            ]}
          />

          <CheckboxList
            label={entityKind === 'DEVICE' ? 'Devices' : 'Assets'}
            items={entities.map((e) => ({ value: e.id, label: e.name }))}
            selected={selectedEntities}
            onChange={(next) => {
              setSelectedEntities(next);
              setSelectedKeys(new Set());
            }}
            searchable
            searchPlaceholder={`Search ${entityKind === 'DEVICE' ? 'devices' : 'assets'}…`}
            emptyLabel={entitiesQuery.isLoading ? 'Loading…' : 'No entities found'}
          />

          {selectedEntities.size > 0 && (
            <>
              <CheckboxList
                label="Telemetry keys"
                items={allKeys.map((k) => ({ value: k, label: k }))}
                selected={selectedKeys}
                onChange={setSelectedKeys}
                searchable
                searchPlaceholder="Search keys…"
                emptyLabel={keysLoading ? 'Loading keys…' : 'No telemetry keys reported yet'}
                maxHeightClassName="max-h-44"
              />

              <Select
                label="Widget type for each selected key"
                value={widgetType}
                onChange={(v) => setWidgetType(v as WidgetType)}
                options={BULK_WIDGET_TYPES.map((t) => ({ value: t, label: WIDGET_REGISTRY[t].label }))}
              />
            </>
          )}
        </div>
      </DialogBody>

      <DialogFooter className="min-h-17 items-center justify-between">
        <span className="text-xs text-muted">
          {pairs.length > 0
            ? `${selectedEntities.size} ${entityKind === 'DEVICE' ? 'device' : 'asset'}${selectedEntities.size > 1 ? 's' : ''} — ${selectedKeys.size} key${selectedKeys.size > 1 ? 's' : ''}`
            : 'Pick entities and keys to continue'}
        </span>
        <button
          type="button"
          disabled={pairs.length === 0}
          onClick={handleAdd}
          className="btn-accent rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pairs.length > 0 ? `Add ${pairs.length} widget${pairs.length > 1 ? 's' : ''}` : 'Add widgets'}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
