'use client';

import { Select } from '@/components';
import { useEntities } from '@/hooks';
import type { ConfigRequirement } from '../widget-registry';

/** What a widget's datasource resolves to. 'ALL' stores a filter, not ids, so entities
 * created later are picked up automatically — see use-widget-datasource.ts. */
export type DatasourceScope = 'ALL' | 'SINGLE';

/**
 * The "datasource" step of the widget config wizard — shared by every panel so entity picking
 * behaves identically wherever it appears.
 *
 * The scope choice is the important part: "All devices" is a *live binding*, not a shortcut
 * for checking every box. A widget saved that way re-resolves the entity list on every load,
 * which is what keeps a dashboard correct as the fleet grows.
 */
export function DatasourcePicker({
  requirement,
  entityKinds,
  supportsAllScope,
  entityKind,
  entityId,
  scope,
  onEntityKindChange,
  onEntityIdChange,
  onScopeChange,
}: {
  requirement: Extract<ConfigRequirement, 'required' | 'optional'>;
  entityKinds: Array<'DEVICE' | 'ASSET'>;
  supportsAllScope: boolean;
  entityKind: 'DEVICE' | 'ASSET';
  entityId: string | undefined;
  scope: DatasourceScope;
  onEntityKindChange: (kind: 'DEVICE' | 'ASSET') => void;
  onEntityIdChange: (id: string | undefined) => void;
  onScopeChange: (scope: DatasourceScope) => void;
}) {
  const entitiesQuery = useEntities(entityKind, { pageSize: 200 });
  const entities = entitiesQuery.data?.data ?? [];
  const kindPlural = entityKind === 'DEVICE' ? 'devices' : 'assets';
  const kindNoun = entityKind === 'DEVICE' ? 'device' : 'asset';

  return (
    <div className="flex flex-col gap-4">
      {/* An entity type still has to be picked in ALL scope — "all devices" and "all assets"
       * are different datasources — so this select sits above the scope choice, not inside it. */}
      {entityKinds.length > 1 && (
        <Select
          label="Entity type"
          value={entityKind}
          onChange={(v) => onEntityKindChange(v as 'DEVICE' | 'ASSET')}
          options={entityKinds.map((k) => ({ value: k, label: k === 'DEVICE' ? 'Device' : 'Asset' }))}
        />
      )}

      {supportsAllScope && (
        <div className="flex flex-col gap-1.5">
          <span className="t-field">Scope</span>
          <div className="flex gap-2">
            <ScopeButton
              active={scope === 'ALL'}
              onClick={() => onScopeChange('ALL')}
              label={`All ${kindPlural}`}
              hint="Includes new ones automatically"
            />
            <ScopeButton
              active={scope === 'SINGLE'}
              onClick={() => onScopeChange('SINGLE')}
              label={`One ${kindNoun}`}
              hint="Pinned to the entity you pick"
            />
          </div>
        </div>
      )}

      {scope === 'SINGLE' && (
        <Select
          label={entityKind === 'DEVICE' ? 'Device' : 'Asset'}
          placeholder={entitiesQuery.isLoading ? 'Loading…' : `Select ${kindNoun}`}
          value={entityId}
          onChange={onEntityIdChange}
          options={entities.map((e) => ({ value: e.id, label: e.name }))}
        />
      )}

      {scope === 'ALL' && (
        <p className="rounded-md border border-border px-3 py-2 text-xs text-muted">
          {requirement === 'optional' && !supportsAllScope
            ? 'This widget covers everything by default.'
            : `Live binding to every ${kindNoun}. ${entities.length} right now — new ones appear on their own.`}
        </p>
      )}
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors ${
        active ? 'border-accent bg-surface' : 'border-border hover:bg-tint'
      }`}
    >
      <span className={`text-sm font-medium ${active ? 'text-heading' : 'text-muted'}`}>{label}</span>
      <span className="t-meta">{hint}</span>
    </button>
  );
}
