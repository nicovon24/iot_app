'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AuthGate } from './AuthGate';
import { getImpersonationMeta, type ImpersonationMeta } from '@/lib';
import { endImpersonation } from '@/hooks';

// These pages render their own full-height/full-width widgets (tables, map), so they get
// an edge-to-edge main area instead of the centered card used by simpler settings pages.
const FULL_BLEED_PATHS = ['/', '/dashboard', '/devices', '/alarms', '/assets', '/map', '/admin', '/clients', '/users'];

// Full width but with natural page scroll, unlike FULL_BLEED_PATHS which own their
// height/scroll internally (fixed-height list widgets).
const WIDE_SCROLL_PATHS = ['/entities'];

/**
 * The shell is now the rail plus the page, and nothing else.
 *
 * There used to be an 80px header carrying the page title, a sidebar toggle and its own
 * hide-me button. The title was already being rendered a second time by four of the pages,
 * the toggle now lives at the foot of the rail beside identity, and the design puts the
 * title inside the page as a 42px editorial heading — so the bar had nothing left to do
 * but cost every screen 80px of height.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationMeta | null>(null);

  useEffect(() => {
    setImpersonation(getImpersonationMeta());
  }, []);

  // Close the mobile drawer automatically on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // /login renders its own minimal layout — no sidebar, and not gated by AuthGate
  // (a logged-out user must be able to reach this page without being redirected to itself).
  if (pathname === '/login') return <>{children}</>;

  return (
    <AuthGate>
      <div className="flex h-screen w-full overflow-hidden bg-surface">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-40 bg-black/65 md:hidden"
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
            <div className="flex shrink-0 items-center justify-between gap-3 bg-warning px-4 py-1.5 text-sm font-medium text-on-warning">
              <span>Viewing as {impersonation.label}</span>
              <button
                type="button"
                onClick={() => void endImpersonation()}
                className="border border-on-warning/25 px-2.5 py-1 text-xs font-semibold transition hover:bg-on-warning/10"
              >
                Back to my session
              </button>
            </div>
          )}

          {/* The rail is a drawer below md, so the only chrome the page keeps is the
            * control that opens it. It floats rather than occupying a bar, which is
            * what keeps the layout identical on both sides of the breakpoint. */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="surface-raised fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center text-muted transition-colors duration-fast ease-out hover:text-heading md:hidden"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>

          {FULL_BLEED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ? (
            <main className="flex-1 overflow-hidden px-10 pb-0 pt-[34px]">
              <div className="h-full w-full">{children}</div>
            </main>
          ) : WIDE_SCROLL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ? (
            <main className="flex-1 overflow-y-auto px-10 pb-8 pt-[34px]">
              <div className="w-full">{children}</div>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto px-10 pb-8 pt-[34px]">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
