'use client';

import { HeroUIProvider } from '@heroui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                'flex w-full items-start gap-3 rounded-xl border border-border bg-surface-card px-4 py-3 shadow-lg',
              title: 'text-sm font-semibold text-heading',
              description: 'mt-0.5 text-xs text-muted',
              icon: 'shrink-0',
              success: 'border-l-4 border-l-emerald-500',
              error:
                'border border-red-600/30 border-l-4 border-l-red-600 bg-red-50 dark:bg-red-950/40 [&_[data-title]]:text-red-700 dark:[&_[data-title]]:text-red-400 [&_[data-icon]]:text-red-600',
              closeButton: 'border-border bg-surface text-body hover:bg-surface-card',
            },
          }}
        />
        {children}
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
