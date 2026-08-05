'use client';

import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';

export interface CountTileWidgetProps {
  label: string;
  value: number;
  isLoading?: boolean;
  accent?: 'ok' | 'danger' | 'info';
  icon: LucideIcon;
}

export function CountTileWidget({ label, value, isLoading, accent = 'info', icon: Icon }: CountTileWidgetProps) {
  return (
    <div className="glass-card flex items-center gap-3 px-5 py-4">
      {isLoading ? (
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      ) : (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `linear-gradient(135deg, var(--gradient-${accent}-from), var(--gradient-${accent}-to))` }}
        >
          <Icon size={18} className="text-white" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        {isLoading ? (
          <Skeleton className="h-7 w-12 rounded-lg" />
        ) : (
          <span className="animate-fade-up text-2xl font-semibold text-heading">{value}</span>
        )}
      </div>
    </div>
  );
}
