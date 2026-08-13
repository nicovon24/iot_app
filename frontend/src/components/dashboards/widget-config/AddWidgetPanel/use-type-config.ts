import { useState } from 'react';
import type { WidgetType } from '../widget-registry';
import { TYPE_CONFIG_FIELDS } from './type-config-fields';

/**
 * Generic state/seed/reset/build for the widget-config fields declared in TYPE_CONFIG_FIELDS —
 * replaces the hand-written useState + seed-effect-branch + resetTypeConfig-branch + buildConfig-
 * branch that every one of those fields used to need in AddWidgetPanel/index.tsx. Values are kept
 * in one `Record<string, unknown>` keyed by FieldSpec.key rather than one useState per field,
 * since they're all read/written the same generic way here.
 */
export function useTypeConfig() {
  const [values, setValues] = useState<Record<string, unknown>>({});

  function get<V>(widgetType: WidgetType | undefined, key: string): V {
    const spec = widgetType && TYPE_CONFIG_FIELDS[widgetType]?.find((f) => f.key === key);
    if (key in values) return values[key] as V;
    return (spec?.default ?? undefined) as V;
  }

  function set(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /** Seeds every declared field for `widgetType` from a saved config (editing an existing widget). */
  function seed(widgetType: WidgetType, config: Record<string, unknown>) {
    const fields = TYPE_CONFIG_FIELDS[widgetType] ?? [];
    const next: Record<string, unknown> = {};
    for (const f of fields) next[f.key] = f.fromConfig(config);
    setValues(next);
  }

  /** Clears every declared field back to its default — called on reset() and on switching type. */
  function resetAll() {
    setValues({});
  }

  /** Writes every declared field for `widgetType` into a config object, same shouldSave/toConfig
   * rules the old hand-written buildConfig branches used. */
  function buildInto(widgetType: WidgetType | undefined, scope: 'SINGLE' | 'ALL', config: Record<string, unknown>) {
    const fields = widgetType ? (TYPE_CONFIG_FIELDS[widgetType] ?? []) : [];
    for (const f of fields) {
      const value = get(widgetType, f.key);
      if (f.shouldSave(value, { scope })) Object.assign(config, f.toConfig(value));
    }
  }

  return { get, set, seed, resetAll, buildInto };
}
