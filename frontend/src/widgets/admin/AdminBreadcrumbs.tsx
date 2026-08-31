'use client';

import { ChevronRight, Home } from 'lucide-react';

export interface AdminBreadcrumbsProps {
  rootLabel: string;
  trail: { id: string; name: string }[];
  onNavigate: (index: number) => void;
}

export function AdminBreadcrumbs({ rootLabel, trail, onNavigate }: AdminBreadcrumbsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted">
      <button
        type="button"
        onClick={() => onNavigate(-1)}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-tint ${trail.length === 0 ? 'font-semibold text-heading' : ''}`}
      >
        <Home size={12} /> {rootLabel}
      </button>
      {trail.map((crumb, i) => (
        <span key={crumb.id} className="flex items-center gap-1">
          <ChevronRight size={12} className="text-faint" />
          <button
            type="button"
            onClick={() => onNavigate(i)}
            className={`rounded px-1.5 py-0.5 hover:bg-tint ${i === trail.length - 1 ? 'font-semibold text-heading' : ''}`}
          >
            {crumb.name}
          </button>
        </span>
      ))}
    </div>
  );
}
