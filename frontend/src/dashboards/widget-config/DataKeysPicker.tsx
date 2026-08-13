'use client';

import { Checkbox } from '@/components/ui/Input';
import {
  ALL_KEYS,
  ATTRIBUTE_SCOPES,
  ATTRIBUTE_SCOPE_LABELS,
  type DataKey,
} from './use-widget-datasource';
import type { AttributeScope } from '@/types';

/**
 * Column picker for table widgets. Each group (the three attribute scopes, plus telemetry)
 * is independently either "all of it" or a hand-picked set, and the groups combine into one
 * table — which is the whole point: firmware version (server attribute) beside live
 * temperature (telemetry) in the same row.
 *
 * "All" is stored as a wildcard rather than expanding to the keys that exist today, so a key
 * reported later appears on its own. That's the same rule as entityScope: 'ALL'.
 */
export function DataKeysPicker({
  value,
  onChange,
  attributeKeys,
  telemetryKeys,
  isLoading,
}: {
  value: DataKey[];
  onChange: (next: DataKey[]) => void;
  attributeKeys: Record<AttributeScope, string[]>;
  telemetryKeys: string[];
  isLoading?: boolean;
}) {
  function groupEntries(source: 'ATTRIBUTE' | 'TELEMETRY', scope?: AttributeScope) {
    return value.filter((k) =>
      k.source === 'ATTRIBUTE' ? source === 'ATTRIBUTE' && k.scope === scope : source === 'TELEMETRY',
    );
  }

  function isAll(source: 'ATTRIBUTE' | 'TELEMETRY', scope?: AttributeScope) {
    return groupEntries(source, scope).some((k) => k.key === ALL_KEYS);
  }

  function selectedKeys(source: 'ATTRIBUTE' | 'TELEMETRY', scope?: AttributeScope) {
    return new Set(groupEntries(source, scope).filter((k) => k.key !== ALL_KEYS).map((k) => k.key));
  }

  /** Replaces one group's entries wholesale, leaving every other group untouched. */
  function replaceGroup(source: 'ATTRIBUTE' | 'TELEMETRY', scope: AttributeScope | undefined, next: DataKey[]) {
    const others = value.filter((k) =>
      k.source === 'ATTRIBUTE' ? !(source === 'ATTRIBUTE' && k.scope === scope) : source !== 'TELEMETRY',
    );
    onChange([...others, ...next]);
  }

  function makeKey(source: 'ATTRIBUTE' | 'TELEMETRY', scope: AttributeScope | undefined, key: string): DataKey {
    return source === 'ATTRIBUTE'
      ? { source: 'ATTRIBUTE', scope: scope as AttributeScope, key }
      : { source: 'TELEMETRY', key };
  }

  function toggleAll(source: 'ATTRIBUTE' | 'TELEMETRY', scope?: AttributeScope) {
    replaceGroup(source, scope, isAll(source, scope) ? [] : [makeKey(source, scope, ALL_KEYS)]);
  }

  function toggleKey(source: 'ATTRIBUTE' | 'TELEMETRY', scope: AttributeScope | undefined, key: string) {
    const selected = selectedKeys(source, scope);
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    // Ticking an individual key drops the wildcard — the two would be redundant, and leaving
    // it would make unticking a key look broken (it'd still be covered by "All").
    replaceGroup(
      source,
      scope,
      Array.from(selected).map((k) => makeKey(source, scope, k)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ATTRIBUTE_SCOPES.map((scope) => (
        <Group
          key={scope}
          title={ATTRIBUTE_SCOPE_LABELS[scope]}
          keys={attributeKeys[scope]}
          all={isAll('ATTRIBUTE', scope)}
          selected={selectedKeys('ATTRIBUTE', scope)}
          onToggleAll={() => toggleAll('ATTRIBUTE', scope)}
          onToggleKey={(key) => toggleKey('ATTRIBUTE', scope, key)}
          isLoading={isLoading}
        />
      ))}
      <Group
        title="Telemetry"
        keys={telemetryKeys}
        all={isAll('TELEMETRY')}
        selected={selectedKeys('TELEMETRY')}
        onToggleAll={() => toggleAll('TELEMETRY')}
        onToggleKey={(key) => toggleKey('TELEMETRY', undefined, key)}
        isLoading={isLoading}
      />
    </div>
  );
}

function Group({
  title,
  keys,
  all,
  selected,
  onToggleAll,
  onToggleKey,
  isLoading,
}: {
  title: string;
  keys: string[];
  all: boolean;
  selected: Set<string>;
  onToggleAll: () => void;
  onToggleKey: (key: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-body">
          {title}
          {all && <span className="ml-1.5 text-xs font-normal text-accent">all</span>}
          {!all && selected.size > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted">({selected.size})</span>
          )}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-accent">
          <Checkbox checked={all} onChange={onToggleAll} />
          Include all
        </label>
      </div>

      {all ? (
        <p className="text-xs text-faint">Every key in this group, including ones reported later.</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-muted">{isLoading ? 'Loading…' : 'Nothing reported yet'}</p>
      ) : (
        <div className="table-scroll flex max-h-32 flex-col gap-1 overflow-y-auto">
          {keys.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-body hover:bg-surface"
            >
              <Checkbox checked={selected.has(key)} onChange={() => onToggleKey(key)} />
              {key}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
