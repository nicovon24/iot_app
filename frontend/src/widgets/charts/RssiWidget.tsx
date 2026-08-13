'use client';

import { formatTelemetryValue } from '@/lib/format';

export interface RssiWidgetProps {
  label: string;
  value?: number;
  min: number;
  max: number;
  unit?: string;
  ts?: number;
}

/**
 * Signal strength as stepped bars — the phone-status-bar convention, readable at a glance from
 * across a room in a way a dBm number never is.
 *
 * Bars are lit by rounding *up* from the ratio: any signal at all lights the first bar, so
 * "barely connected" and "disconnected" don't look identical.
 */
const BARS = 5;

export function RssiWidget({ label, value, min, max, unit, ts }: RssiWidgetProps) {
  const hasValue = value !== undefined && Number.isFinite(value);
  const ratio = hasValue && max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const lit = hasValue ? Math.ceil(ratio * BARS) : 0;

  return (
    <div className="glass-card flex h-full flex-col items-center justify-center gap-2 p-4">
      <span className="w-full truncate text-center text-xs font-semibold uppercase tracking-wider text-muted" title={label}>
        {label}
      </span>

      <svg viewBox="0 0 100 46" className="min-h-0 w-full flex-1" role="img" aria-label={`${label}: ${value ?? 'no data'}`}>
        {Array.from({ length: BARS }, (_, i) => {
          const height = 8 + i * 8;
          return (
            <rect
              key={i}
              x={8 + i * 18}
              y={44 - height}
              width={12}
              height={height}
              rx={2}
              fill={i < lit ? 'var(--color-accent)' : 'var(--color-border)'}
            />
          );
        })}
      </svg>

      <div className="flex shrink-0 flex-col items-center">
        <span className="text-2xl font-semibold text-heading">
          {hasValue ? (formatTelemetryValue(String(value)) ?? value) : '—'}
          {hasValue && unit ? <span className="ml-1 text-base font-normal text-body">{unit}</span> : null}
        </span>
        <span className="text-xs text-faint">{ts ? new Date(ts).toLocaleTimeString() : 'Waiting for data…'}</span>
      </div>
    </div>
  );
}
