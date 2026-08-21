'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Clock } from 'lucide-react';
// Reached directly rather than through the '@/components' barrel: that barrel re-exports
// DashboardCanvas, which imports react-grid-layout's stylesheet, and pulling a .css file in
// left time-window.check.ts unable to run at all outside a bundler. Same relative-import
// shape AppLayout already uses for its ui primitives.
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';
import type { DashboardTimeWindow } from '@/types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Presets stop at 90 days rather than running to a year: beyond a quarter the raw-point ceiling
 * on history queries starts truncating, and a range that long is a deliberate choice better made
 * through Custom range than reached by accident from a dropdown. */
export const TIME_WINDOW_PRESETS: Array<{ value: string; label: string; ms: number }> = [
  { value: '15m', label: 'Last 15 minutes', ms: 15 * MINUTE },
  { value: '1h', label: 'Last hour', ms: HOUR },
  { value: '6h', label: 'Last 6 hours', ms: 6 * HOUR },
  { value: '24h', label: 'Last 24 hours', ms: DAY },
  { value: '7d', label: 'Last 7 days', ms: 7 * DAY },
  { value: '30d', label: 'Last 30 days', ms: 30 * DAY },
  { value: '90d', label: 'Last 90 days', ms: 90 * DAY },
];

const CUSTOM = 'custom';

/**
 * The dashboard's time window, read by every timeseries widget.
 *
 * Delivered by context rather than props because the widgets are rendered through
 * DashboardCanvas → react-grid-layout → DashboardWidgetRenderer, and none of that chain has any
 * business knowing about time. `null` means no window is configured, which every consumer reads
 * as "use your own default" — that is what keeps pre-10-04 dashboards behaving as they did.
 */
const TimeWindowContext = createContext<DashboardTimeWindow | null>(null);

export function TimeWindowProvider({
  value,
  children,
}: {
  value: DashboardTimeWindow | null;
  children: ReactNode;
}) {
  return <TimeWindowContext.Provider value={value}>{children}</TimeWindowContext.Provider>;
}

export function useDashboardTimeWindow(): DashboardTimeWindow | null {
  return useContext(TimeWindowContext);
}

/** Maps a stored window back onto a preset, so reopening a dashboard shows the right selection. */
function presetValueFor(window: DashboardTimeWindow | null): string {
  if (!window) return '1h';
  if (window.kind === 'FIXED') return CUSTOM;
  return TIME_WINDOW_PRESETS.find((p) => p.ms === window.ms)?.value ?? CUSTOM;
}

/** `datetime-local` wants 'YYYY-MM-DDTHH:mm' in *local* time, not an ISO-8601 UTC string. */
function toLocalInputValue(ts: number): string {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * MINUTE);
  return d.toISOString().slice(0, 16);
}

export function TimeWindowPicker({
  value,
  onChange,
}: {
  value: DashboardTimeWindow | null;
  onChange: (next: DashboardTimeWindow) => void;
}) {
  /**
   * Derived from the prop rather than held in state.
   *
   * A `useState(() => presetValueFor(value))` initialiser runs once, and this picker mounts
   * before the dashboard query resolves — so it latched onto the default while `value` was
   * still null and never caught up. A saved 30-day window came back showing "Last hour", which
   * looked like the window hadn't saved at all, and re-saving from that state then wrote the
   * stale selection over the stored one.
   *
   * The one piece of genuinely local state is whether the user has *chosen* Custom, since a
   * FIXED window and a Custom selection aren't quite the same thing mid-edit.
   */
  const [customPicked, setCustomPicked] = useState(false);
  const selected = customPicked || value?.kind === 'FIXED' ? CUSTOM : presetValueFor(value);

  const fixed = value?.kind === 'FIXED' ? value : undefined;
  const options = useMemo(
    () => [...TIME_WINDOW_PRESETS.map((p) => ({ value: p.value, label: p.label })), { value: CUSTOM, label: 'Custom range' }],
    [],
  );

  function handleSelect(next: string) {
    if (next === CUSTOM) {
      setCustomPicked(true);
      // Seed the custom range from the window currently in effect, so switching to Custom
      // doesn't blank the charts until both inputs are filled.
      const endTs = Date.now();
      const ms = value?.kind === 'LAST' ? value.ms : HOUR;
      onChange({ kind: 'FIXED', startTs: endTs - ms, endTs });
      return;
    }
    setCustomPicked(false);
    const preset = TIME_WINDOW_PRESETS.find((p) => p.value === next);
    if (preset) onChange({ kind: 'LAST', ms: preset.ms });
  }

  function handleBound(which: 'startTs' | 'endTs', localValue: string) {
    if (!fixed || !localValue) return;
    const ts = new Date(localValue).getTime();
    if (Number.isNaN(ts)) return;
    const next = { ...fixed, [which]: ts };
    // The backend rejects an inverted range; don't send one it will 400 on.
    if (next.startTs >= next.endTs) return;
    onChange(next);
  }

  return (
    <div className="flex items-center gap-2">
      <Clock size={15} className="shrink-0 text-muted" />
      <div className="w-44">
        <Select value={selected} onChange={handleSelect} options={options} compact />
      </div>

      {selected === CUSTOM && fixed && (
        <div className="flex items-center gap-1.5">
          <Input
            type="datetime-local"
            value={toLocalInputValue(fixed.startTs)}
            onChange={(e) => handleBound('startTs', e.target.value)}
            aria-label="Range start"
            compact
          />
          <span className="text-xs text-muted">to</span>
          <Input
            type="datetime-local"
            value={toLocalInputValue(fixed.endTs)}
            onChange={(e) => handleBound('endTs', e.target.value)}
            aria-label="Range end"
            compact
          />
        </div>
      )}
    </div>
  );
}
