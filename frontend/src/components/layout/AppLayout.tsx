'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, PanelTopClose } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AuthGate } from './AuthGate';
import { Tooltip } from '../ui/Tooltip';
import { NAV_ITEMS } from '@/lib/nav-items';
import { getImpersonationMeta, type ImpersonationMeta } from '@/lib/session';
import { endImpersonation } from '@/hooks/users/useImpersonation';

const SIDEBAR_VISIBLE_STORAGE_KEY = 'iot_sidebar_visible';
const HEADER_VISIBLE_STORAGE_KEY = 'iot_header_visible';

// These pages render their own full-height/full-width card widgets (tables, map),
// so they get an edge-to-edge main area instead of the centered max-w-6xl card
// used by simpler settings-style pages.
const FULL_BLEED_PATHS = ['/', '/dashboard', '/devices', '/alarms', '/assets', '/map', '/admin'];

// Full width but with natural page scroll, unlike FULL_BLEED_PATHS which own their
// height/scroll internally (fixed-height list widgets).
const WIDE_SCROLL_PATHS = ['/entities'];

function usePageTitle() {
  const pathname = usePathname();
  if (pathname === '/') return 'Overview';
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? 'Dashboard';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = usePageTitle();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationMeta | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_VISIBLE_STORAGE_KEY);
    if (stored) setSidebarVisible(stored === 'true');
    const storedHeader = window.localStorage.getItem(HEADER_VISIBLE_STORAGE_KEY);
    if (storedHeader) setHeaderVisible(storedHeader === 'true');
    setImpersonation(getImpersonationMeta());
  }, []);

  // Close the mobile drawer automatically on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleSidebarVisible() {
    setSidebarVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_VISIBLE_STORAGE_KEY, String(next));
      return next;
    });
  }

  function toggleHeaderVisible() {
    setHeaderVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem(HEADER_VISIBLE_STORAGE_KEY, String(next));
      return next;
    });
  }

  // /login renders its own minimal layout — no sidebar/header, and not gated by AuthGate
  // (a logged-out user must be able to reach this page without being redirected to itself).
  if (pathname === '/login') return <>{children}</>;

  return (
    <AuthGate>
      <div className="flex h-screen w-full overflow-hidden bg-surface">
        <div className="hidden md:flex">
          <Sidebar visible={sidebarVisible} />
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        <div className="md:hidden">
          <Sidebar visible={mobileOpen} mobile onClose={() => setMobileOpen(false)} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {impersonation && (
            <div className="flex shrink-0 items-center justify-between gap-3 bg-amber-500 px-4 py-1.5 text-sm font-medium text-black">
              <span>Viewing as {impersonation.label}</span>
              <button
                type="button"
                onClick={() => void endImpersonation()}
                className="rounded-md border border-black/20 px-2.5 py-1 text-xs font-semibold transition hover:bg-black/10"
              >
                Back to my session
              </button>
            </div>
          )}
          {/* Collapsing the header is what buys a dashboard its vertical space, so it animates
            * height rather than unmounting — the widget grid below reflows smoothly instead of
            * snapping 80px taller. */}
          <AnimatePresence initial={false}>
            {!headerVisible && (
              <motion.button
                type="button"
                key="show-header"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                onClick={toggleHeaderVisible}
                aria-label="Show header"
                title="Show header"
                className="fixed right-4 top-2 z-50 flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold text-white shadow-lg"
                style={{
                  background: 'linear-gradient(90deg, var(--gradient-header-from), var(--gradient-header-to))',
                }}
              >
                <ChevronDown size={14} strokeWidth={2.25} />
                Header
              </motion.button>
            )}
          </AnimatePresence>

          <motion.header
            initial={false}
            animate={{ height: headerVisible ? 80 : 0, opacity: headerVisible ? 1 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex shrink-0 items-center gap-3 overflow-hidden px-8 text-white shadow-sm"
            style={{
              background: 'linear-gradient(90deg, var(--gradient-header-from), var(--gradient-header-to))',
            }}
          >
            <Tooltip label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}>
              <button
                type="button"
                aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
                onClick={toggleSidebarVisible}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white md:flex"
              >
                {sidebarVisible ? <PanelLeftClose size={20} strokeWidth={1.75} /> : <PanelLeftOpen size={20} strokeWidth={1.75} />}
              </button>
            </Tooltip>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            >
              <Menu size={20} strokeWidth={1.75} />
            </button>
            <span className="text-xl font-semibold tracking-tight">{pageTitle}</span>

            <Tooltip label="Hide header" side="bottom">
              <button
                type="button"
                aria-label="Hide header"
                onClick={toggleHeaderVisible}
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <PanelTopClose size={20} strokeWidth={1.75} />
              </button>
            </Tooltip>
          </motion.header>
          {FULL_BLEED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ? (
            <main className="flex-1 overflow-hidden p-6">
              <div className="h-full w-full">{children}</div>
            </main>
          ) : WIDE_SCROLL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ? (
            <main className="flex-1 overflow-y-auto p-6">
              <div className="w-full">{children}</div>
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
