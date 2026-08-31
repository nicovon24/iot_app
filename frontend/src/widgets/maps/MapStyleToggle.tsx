'use client';

import type { MapTileStyle } from '@/lib';

export interface MapStyleToggleProps {
  value: MapTileStyle;
  onChange: (style: MapTileStyle) => void;
}

export function MapStyleToggle({ value, onChange }: MapStyleToggleProps) {
  return (
    /* .map-style-toggle is hidden by globals.css while a dashboard is in edit mode — it sits in
     * the same corner as the widget toolbar, and it's not usable there anyway.
     *
     * The surface token is translucent by design, which works over the app's own background but
     * leaves map tiles showing through the control; the backdrop blur restores the separation. */
    <div className="map-style-toggle absolute right-2 top-2 z-1000 flex overflow-hidden rounded-md border border-border bg-surface-card shadow-lg backdrop-blur-md">
      <button
        type="button"
        onClick={() => onChange('dark')}
        className={`cursor-pointer px-2 py-1 text-xs font-medium transition-colors ${
          value === 'dark' ? 'bg-accent-strong text-on-accent' : 'text-body hover:bg-tint'
        }`}
      >
        Minimal
      </button>
      <button
        type="button"
        onClick={() => onChange('color')}
        className={`cursor-pointer px-2 py-1 text-xs font-medium transition-colors ${
          value === 'color' ? 'bg-accent-strong text-on-accent' : 'text-body hover:bg-tint'
        }`}
      >
        Streets
      </button>
    </div>
  );
}
