'use client';

import { WidgetPreview } from '../WidgetPreview';
import { WIDGET_REGISTRY, widgetsByCategory, type WidgetCategory, type WidgetType } from '../widget-registry';

export function GalleryStep({
  category,
  onPick,
}: {
  category: WidgetCategory;
  onPick: (type: WidgetType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {(widgetsByCategory().find((g) => g.category === category)?.types ?? []).map((type) => {
        const m = WIDGET_REGISTRY[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className="flex flex-col gap-2 rounded-md border border-border p-3 text-left transition-colors hover:border-accent hover:bg-surface"
          >
            <span className="text-sm font-medium text-heading">{m.label}</span>
            <div className="pointer-events-none h-40 overflow-hidden rounded">
              <WidgetPreview type={type} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
