'use client';

import { motion } from 'framer-motion';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { formatTelemetryValue } from '@/lib';

export interface ValueTileWidgetProps {
  label: string;
  value?: string;
  unit?: string;
  ts?: number;
  /** Recent history for the sparkline flag. Undefined/empty falls back to the plain tile with
   * zero visual difference — no empty chart box for a device with no history yet. */
  sparklineData?: { ts: number; value: number }[];
}

export function ValueTileWidget({ label, value, unit, ts, sparklineData }: ValueTileWidgetProps) {
  const displayValue = formatTelemetryValue(value);

  return (
    <div className="glass-card flex flex-col gap-1 px-5 py-4">
      <span className="t-label">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0.4, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="t-display"
      >
        {displayValue ?? '—'}
        {displayValue && unit ? <span className="ml-1 text-base font-normal text-body">{unit}</span> : null}
      </motion.span>
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-8 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <span className="t-meta">
        {ts ? `Updated ${new Date(ts).toLocaleTimeString()}` : 'Waiting for data…'}
      </span>
    </div>
  );
}
