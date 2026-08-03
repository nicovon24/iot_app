'use client';

import { motion } from 'framer-motion';
import { formatTelemetryValue } from '@/lib/format';

export interface ValueTileWidgetProps {
  label: string;
  value?: string;
  unit?: string;
  ts?: number;
}

export function ValueTileWidget({ label, value, unit, ts }: ValueTileWidgetProps) {
  const displayValue = formatTelemetryValue(value);

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-card px-5 py-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0.4, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="text-2xl font-semibold text-heading"
      >
        {displayValue ?? '—'}
        {displayValue && unit ? <span className="ml-1 text-base font-normal text-body">{unit}</span> : null}
      </motion.span>
      <span className="text-xs text-faint">
        {ts ? `Updated ${new Date(ts).toLocaleTimeString()}` : 'Waiting for data…'}
      </span>
    </div>
  );
}
