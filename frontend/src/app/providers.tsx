'use client';

import { HeroUIProvider } from '@heroui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                'flex w-full items-start gap-3 rounded-xl border border-border bg-surface-card px-4 py-3 shadow-lg',
              title: 't-heading',
              description: 'mt-0.5 text-xs text-muted',
              icon: 'shrink-0',
              success: 'border-l-4 border-l-accent',
              error:
                'border border-danger/30 border-l-4 border-l-danger bg-danger/10 [&_[data-title]]:text-danger [&_[data-icon]]:text-danger',
              closeButton:
                '!static !order-last !ms-auto !me-0 !top-auto !start-auto !translate-x-0 !translate-y-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent/40 hover:bg-surface-card hover:text-heading',
            },
          }}
        />
        {children}
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
