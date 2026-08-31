'use client';

import { CATEGORY_ICONS, widgetsByCategory, type WidgetCategory } from '../widget-registry';

export function CategoryStep({ onPick }: { onPick: (category: WidgetCategory) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {widgetsByCategory().map(({ category: cat, types }) => {
        const CategoryIcon = CATEGORY_ICONS[cat];
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onPick(cat)}
            className="flex flex-col items-start gap-2 rounded-md border border-border p-4 text-left transition-colors hover:border-accent hover:bg-tint"
          >
            <CategoryIcon size={22} className="text-accent" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-heading">{cat}</span>
              <span className="text-xs text-muted">
                {types.length} widget{types.length === 1 ? '' : 's'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
