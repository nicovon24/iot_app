'use client';

import { formatTelemetryValue } from '@\/lib';

export interface GaugeShellProps {
  label: string;
  value?: number;
  unit?: string;
  ts?: number;
  children: React.ReactNode;
}

/**
 * Shared chrome for the SVG gauge-family widgets (Gauge/Battery/Rssi): label header, the
 * caller's own SVG in the middle, and the value/timestamp readout footer. Each widget still owns
 * its SVG shape — this only dedupes the wrapper they were all pasting.
 */
export function GaugeShell({ label, value, unit, ts, children }: GaugeShellProps) {
  const hasValue = value !== undefined && Number.isFinite(value);

  return (
    <div className="glass-card flex h-full flex-col items-center justify-center gap-1 p-4">
      <span className="w-full truncate text-center text-xs font-semibold uppercase tracking-wider text-muted" title={label}>
        {label}
      </span>

      {children}

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
