'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AuthGate } from './AuthGate';
import { Tooltip } from './Tooltip';
import { NAV_ITEMS } from '@/lib/nav-items';

const SIDEBAR_VISIBLE_STORAGE_KEY = 'iot_sidebar_visible';

// These pages render their own full-height/full-width card widgets (tables, map),
// so they get an edge-to-edge main area instead of the centered max-w-6xl card
// used by simpler settings-style pages.
const FULL_BLEED_PATHS = ['/dashboard', '/devices', '/alarms', '/assets', '/map'];

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
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_VISIBLE_STORAGE_KEY);
    if (stored) setSidebarVisible(stored === 'true');
  }, []);

  function toggleSidebarVisible() {
    setSidebarVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_VISIBLE_STORAGE_KEY, String(next));
      return next;
    });
  }

  // /login renders its own minimal layout — no sidebar/header, and not gated by AuthGate
  // (a logged-out user must be able to reach this page without being redirected to itself).
  if (pathname === '/login') return <>{children}</>;

  return (
    <AuthGate>
      <div className="flex h-screen w-full overflow-hidden bg-surface">
        <Sidebar visible={sidebarVisible} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header
            className="flex h-20 shrink-0 items-center gap-3 px-8 text-white shadow-sm"
            style={{
              background: 'linear-gradient(90deg, var(--gradient-header-from), var(--gradient-header-to))',
            }}
          >
            <Tooltip label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}>
              <button
                type="button"
                aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
                onClick={toggleSidebarVisible}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                {sidebarVisible ? <PanelLeftClose size={20} strokeWidth={1.75} /> : <PanelLeftOpen size={20} strokeWidth={1.75} />}
              </button>
            </Tooltip>
            <span className="text-xl font-semibold tracking-tight">{pageTitle}</span>
          </header>
          {FULL_BLEED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ? (
            <main className="flex-1 overflow-hidden p-6">
              <div className="h-full w-full">{children}</div>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-8">
              <div className="mx-auto max-w-6xl rounded-xl bg-surface-card p-6 shadow-sm">
                {children}
              </div>
            </main>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
