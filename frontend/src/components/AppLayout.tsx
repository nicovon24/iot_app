'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AuthGate } from './AuthGate';
import { NAV_ITEMS } from '@/lib/nav-items';

function usePageTitle() {
  const pathname = usePathname();
  if (pathname === '/') return 'Dashboard';
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? 'Dashboard';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = usePageTitle();

  // /login renders its own minimal layout — no sidebar/header, and not gated by AuthGate
  // (a logged-out user must be able to reach this page without being redirected to itself).
  if (pathname === '/login') return <>{children}</>;

  return (
    <AuthGate>
      <div className="flex h-screen w-full overflow-hidden bg-surface">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header
            className="flex h-20 shrink-0 items-center px-8 text-white shadow-sm"
            style={{
              background: 'linear-gradient(90deg, var(--gradient-header-from), var(--gradient-header-to))',
            }}
          >
            <span className="text-xl font-semibold tracking-tight">{pageTitle}</span>
          </header>
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-6xl rounded-xl bg-surface-card p-6 shadow-sm">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
