'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { NAV_GROUPS, NAV_ITEMS, logout } from '@/lib';
import { useCurrentUser, usePermissions } from '@/hooks';
import { Tooltip } from '../ui/Tooltip';

const SIDEBAR_STORAGE_KEY = 'iot_sidebar_expanded';

export function Sidebar({
  visible = true,
  mobile = false,
  onClose,
}: {
  visible?: boolean;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSysadmin } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  // Users management is sysadmin-only on the backend (RolesGuard) — hidden from the nav for
  // everyone else rather than shown and then 403ing on every action.
  const visibleNavItems = NAV_ITEMS.filter((item) => item.href !== '/users' || isSysadmin);
  const [expanded, setExpanded] = useState(true);
  const isExpanded = mobile ? true : expanded;

  useEffect(() => {
    if (mobile) return;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) setExpanded(stored === 'true');
  }, [mobile]);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const email = currentUser?.email ?? null;

  return (
    <motion.aside
      animate={mobile ? { x: visible ? 0 : '-100%' } : { width: visible ? (expanded ? 246 : 68) : 0 }}
      initial={mobile ? { x: '-100%' } : false}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={
        mobile
          ? 'fixed inset-y-0 left-0 z-50 flex h-full w-full flex-col overflow-hidden border-r border-border bg-surface-raised'
          : 'relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-raised'
      }
    >
      <div className={`flex shrink-0 items-center gap-3 ${isExpanded ? 'px-6 pb-5 pt-6' : 'justify-center py-6'}`}>
        {/* The mark is a colour logo on a monochrome rail; desaturating and lifting it keeps
          * the rail one material instead of parking a sticker at the top of it. */}
        <Image
          src="/logo.png"
          alt="IoTArg logo"
          width={30}
          height={30}
          className="h-[30px] w-[30px] shrink-0 object-contain [filter:grayscale(1)_brightness(2.2)]"
          priority
        />
        {isExpanded && (
          <span className="truncate text-[17px] font-extrabold leading-none tracking-[-0.015em] text-heading">
            IoTArg
          </span>
        )}
        {mobile && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center text-muted transition-colors duration-fast ease-out hover:bg-tint hover:text-heading"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-[14px]">
        {NAV_GROUPS.map((group, groupIndex) => {
          const items = visibleNavItems.filter((item) => item.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group}>
              {/* A hairline opens each group but not the first — the rail's own top
                * padding already does that one. Collapsed, the label disappears and the
                * hairline is all that survives to keep the grouping legible. */}
              {groupIndex > 0 && <div className="mx-[10px] my-4 h-px bg-border" />}
              {isExpanded ? (
                <div className="t-label-lg px-[10px] pb-[10px]">{group}</div>
              ) : (
                groupIndex === 0 && <div className="mx-[10px] mb-[10px] h-px bg-border" />
              )}

              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                const row = (
                  <div
                    className={`flex h-10 items-center gap-[11px] px-[10px] transition-colors duration-fast ease-out ${
                      isExpanded ? '' : 'justify-center'
                    } ${
                      item.comingSoon
                        ? 'cursor-not-allowed text-disabled'
                        : isActive
                          ? 'bg-accent-strong font-bold text-on-accent'
                          : 'text-nav hover:bg-tint-strong hover:text-heading'
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                    {isExpanded && <span className="flex-1 truncate text-[13.5px] leading-none">{item.label}</span>}
                  </div>
                );

                const tooltipLabel = item.comingSoon ? `${item.label} — Coming soon` : item.label;

                const inner = item.comingSoon ? (
                  row
                ) : (
                  <Link href={item.href} aria-label={item.label} onClick={onClose}>
                    {row}
                  </Link>
                );

                return <div key={item.href}>{isExpanded ? inner : <Tooltip label={tooltipLabel}>{inner}</Tooltip>}</div>;
              })}
            </div>
          );
        })}
      </nav>

      {/* The rail's foot. Identity lives here rather than in a top bar, which is what
        * lets the header go away entirely and gives every page its full height back. */}
      <div
        className={`flex shrink-0 items-center gap-[11px] border-t border-border py-4 ${
          isExpanded ? 'px-6' : 'flex-col px-2'
        }`}
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-accent-strong text-[12px] font-extrabold leading-none text-accent"
        >
          {(email ?? '?').charAt(0).toUpperCase()}
        </span>
        {isExpanded && (
          <span className="min-w-0 flex-1 truncate text-[12px] leading-none text-nav" title={email ?? undefined}>
            {email ?? 'Signed in'}
          </span>
        )}
        <Tooltip label="Log out">
          <button
            type="button"
            aria-label="Log out"
            onClick={handleLogout}
            className="flex h-7 w-7 shrink-0 items-center justify-center text-faint transition-colors duration-fast ease-out hover:text-danger"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </Tooltip>
      </div>

      {!mobile && (
        <div className="shrink-0 border-t border-border p-2">
          <button
            type="button"
            aria-label={expanded ? 'Hide labels' : 'Show labels'}
            onClick={toggleExpanded}
            className={`flex h-8 w-full items-center gap-[11px] px-2 text-faint transition-colors duration-fast ease-out hover:bg-tint hover:text-heading ${
              isExpanded ? '' : 'justify-center'
            }`}
          >
            {expanded ? <PanelLeftClose size={16} strokeWidth={1.75} /> : <PanelLeftOpen size={16} strokeWidth={1.75} />}
            {isExpanded && <span className="t-label">Collapse</span>}
          </button>
        </div>
      )}
    </motion.aside>
  );
}
