'use client';

import { GaugeShell } from './GaugeShell';

export interface BatteryWidgetProps {
  label: string;
  value?: number;
  min: number;
  max: number;
  unit?: string;
  ts?: number;
}

/**
 * Charge level drawn as a battery that fills. The shape carries the meaning on its own — a
 * quarter-full battery reads as "low" without reading the number, which a bare value tile
 * can't do.
 *
 * Colour is by charge band, the one place in the widget set where hue encodes something:
 * an empty battery is an actionable state, not just a smaller number.
 */
const LOW = 0.2;
const MEDIUM = 0.5;

function bandColor(ratio: number) {
  if (ratio <= LOW) return 'var(--color-danger)';
  if (ratio <= MEDIUM) return '#f59e0b';
  return '#22c55e';
}

export function BatteryWidget({ label, value, min, max, unit, ts }: BatteryWidgetProps) {
  const hasValue = value !== undefined && Number.isFinite(value);
  // Clamped so an out-of-range reading fills to an end instead of overflowing the casing.
  const ratio = hasValue && max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;

  return (
    <GaugeShell label={label} value={value} unit={unit} ts={ts}>
      <svg viewBox="0 0 100 46" className="min-h-0 w-full flex-1" role="img" aria-label={`${label}: ${value ?? 'no data'}`}>
        <rect x={2} y={6} width={84} height={34} rx={6} fill="none" stroke="var(--color-border)" strokeWidth={4} />
        <rect x={88} y={17} width={8} height={12} rx={2} fill="var(--color-border)" />
        {hasValue && ratio > 0 && (
          <rect x={7} y={11} width={74 * ratio} height={24} rx={3} fill={bandColor(ratio)} />
        )}
      </svg>
    </GaugeShell>
  );
}
