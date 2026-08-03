'use client';

import { Spinner } from '@heroui/react';

export interface CountTileWidgetProps {
  label: string;
  value: number;
  isLoading?: boolean;
}

export function CountTileWidget({ label, value, isLoading }: CountTileWidgetProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-card px-5 py-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {isLoading ? (
        <Spinner size="sm" color="primary" />
      ) : (
        <span className="text-2xl font-semibold text-heading">{value}</span>
      )}
    </div>
  );
}
