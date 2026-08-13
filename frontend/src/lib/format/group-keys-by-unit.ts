import { resolveUnit } from './units';

export interface AxisGroup {
  unitSymbol: string | undefined;
  keys: string[];
}

export interface GroupedKeys {
  axes: AxisGroup[];
  omittedKeys: string[];
}

/**
 * Groups telemetry keys by their resolved unit symbol, for the multi-key comparison chart's
 * dual-axis layout. Keys with no configured unit group together under `unitSymbol: undefined`
 * (one shared unitless axis) rather than each getting their own.
 *
 * At most 2 axes are ever returned — a third distinct unit group has nowhere sensible to go:
 * a third Y-axis is unreadable, and normalizing onto a shared axis would strip the unit meaning
 * that is the whole point of this widget. Those keys are reported in `omittedKeys` instead,
 * following the same convention every other capped widget in this app already uses.
 */
export function groupKeysByUnit(keys: string[], units: Record<string, string> | undefined): GroupedKeys {
  const order: string[] = [];
  const byUnit = new Map<string, string[]>();

  for (const key of keys) {
    const resolved = resolveUnit(units?.[key]);
    const groupKey = resolved?.symbol ?? '';
    if (!byUnit.has(groupKey)) {
      order.push(groupKey);
      byUnit.set(groupKey, []);
    }
    byUnit.get(groupKey)!.push(key);
  }

  const axes: AxisGroup[] = order.slice(0, 2).map((groupKey) => ({
    unitSymbol: groupKey === '' ? undefined : groupKey,
    keys: byUnit.get(groupKey)!,
  }));
  const omittedKeys = order.slice(2).flatMap((groupKey) => byUnit.get(groupKey)!);

  return { axes, omittedKeys };
}
