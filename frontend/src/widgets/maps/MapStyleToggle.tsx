'use client';

import type { MapTileStyle } from '@/lib/map-tiles';

export interface MapStyleToggleProps {
  value: MapTileStyle;
  onChange: (style: MapTileStyle) => void;
}

export function MapStyleToggle({ value, onChange }: MapStyleToggleProps) {
  return (
    <div className="absolute right-2 top-2 z-[1000] flex overflow-hidden rounded-md border border-border bg-surface-card shadow-sm">
      <button
        type="button"
        onClick={() => onChange('light')}
        className={`cursor-pointer px-2 py-1 text-xs font-medium transition-colors ${
          value === 'light' ? 'bg-accent text-white' : 'text-body hover:bg-surface'
        }`}
      >
        Minimal
      </button>
      <button
        type="button"
        onClick={() => onChange('color')}
        className={`cursor-pointer px-2 py-1 text-xs font-medium transition-colors ${
          value === 'color' ? 'bg-accent text-white' : 'text-body hover:bg-surface'
        }`}
      >
        Streets
      </button>
    </div>
  );
}
