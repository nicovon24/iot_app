'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, X, type LucideProps } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav-items';
import { logout } from '@/lib/auth';
import { usePermissions } from '@/hooks/useCurrentUser';
import { Tooltip } from '../ui/Tooltip';

const SIDEBAR_STORAGE_KEY = 'iot_sidebar_expanded';

const DASHBOARD_OPTIONS = [{ label: 'Main Dashboard', href: '/dashboard', comingSoon: false }];

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
  // Users management is sysadmin-only on the backend (RolesGuard) — hidden from the nav for
  // everyone else rather than shown and then 403ing on every action.
  const visibleNavItems = NAV_ITEMS.filter((item) => item.href !== '/users' || isSysadmin);
  const [expanded, setExpanded] = useState(true);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  const dashboardMenuRef = useRef<HTMLDivElement>(null);
  const isExpanded = mobile ? true : expanded;

  useEffect(() => {
    if (mobile) return;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) setExpanded(stored === 'true');
  }, [mobile]);

  useEffect(() => {
    if (!dashboardMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dashboardMenuRef.current && !dashboardMenuRef.current.contains(event.target as Node)) {
        setDashboardMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dashboardMenuOpen]);

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

  return (
    <motion.aside
      animate={
        mobile
          ? { x: visible ? 0 : '-100%' }
          : { width: visible ? (expanded ? 208 : 72) : 0 }
      }
      initial={mobile ? { x: '-100%' } : false}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={
        mobile
          ? 'fixed inset-y-0 left-0 z-50 flex h-full w-full flex-col overflow-hidden py-6'
          : 'relative flex h-full shrink-0 flex-col overflow-hidden py-6'
      }
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--gradient-accent)' }}
      />

      <div className={`relative z-10 mb-6 flex items-center gap-2.5 ${isExpanded ? 'px-4' : 'justify-center'}`}>
        <Image src="/logo.png" alt="IoTArg logo" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" priority />
        {isExpanded && <span className="truncate text-sm font-semibold text-white">IoTArg</span>}
        {mobile && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <nav className="relative z-10 flex flex-1 flex-col gap-1 px-3">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isDashboard = item.href === '/dashboard';

          const row = (
            <div
              className={`relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 transition-colors ${
                item.comingSoon
                  ? 'cursor-not-allowed text-white/30'
                  : isActive
                    ? 'text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isActive && !item.comingSoon && (
                <motion.div
                  layoutId={mobile ? 'sidebar-active-pill-mobile' : 'sidebar-active-pill'}
                  className="absolute inset-0 rounded-xl border border-white/20"
                  style={{ background: 'var(--gradient-sidebar-active)' }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <Icon size={20} strokeWidth={1.75} className="relative z-10 shrink-0" />
              {isExpanded && <span className="relative z-10 flex-1 truncate text-sm font-medium">{item.label}</span>}
              {isExpanded && isDashboard && DASHBOARD_OPTIONS.length > 1 && (
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  className={`relative z-10 shrink-0 transition-transform ${dashboardMenuOpen ? 'rotate-180' : ''}`}
                />
              )}
            </div>
          );

          const tooltipLabel = item.comingSoon ? `${item.label} — Coming soon` : item.label;

          if (isDashboard) {
            return (
              <div key={item.href} ref={dashboardMenuRef} className="relative">
                <button
                  type="button"
                  aria-label="Dashboards"
                  onClick={() => {
                    if (DASHBOARD_OPTIONS.length === 1) {
                      router.push(DASHBOARD_OPTIONS[0].href);
                      onClose?.();
                      return;
                    }
                    setDashboardMenuOpen((prev) => !prev);
                  }}
                  className="w-full text-left"
                >
                  {isExpanded ? row : <Tooltip label="Dashboards">{row}</Tooltip>}
                </button>
                <AnimatePresence>
                  {dashboardMenuOpen && DASHBOARD_OPTIONS.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className={`absolute z-50 min-w-45 overflow-hidden rounded-lg bg-navy-950 py-1 shadow-lg ${
                        isExpanded ? 'left-0 top-full mt-1' : 'left-full top-0 ml-2'
                      }`}
                    >
                      {DASHBOARD_OPTIONS.map((option) => (
                        <button
                          key={option.href}
                          type="button"
                          disabled={option.comingSoon}
                          onClick={() => {
                            setDashboardMenuOpen(false);
                            router.push(option.href);
                            onClose?.();
                          }}
                          className={`block w-full whitespace-nowrap px-3 py-2 text-left text-sm font-medium ${
                            option.comingSoon
                              ? 'cursor-not-allowed text-white/30'
                              : pathname === option.href
                                ? 'bg-white/10 text-white'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const inner = item.comingSoon ? (
            row
          ) : (
            <Link href={item.href} aria-label={item.label} onClick={onClose}>
              {row}
            </Link>
          );

          return (
            <div key={item.href}>{isExpanded ? inner : <Tooltip label={tooltipLabel}>{inner}</Tooltip>}</div>
          );
        })}
      </nav>

      <div className="relative z-10 flex flex-col gap-1 px-3">
        {!mobile && (
          <SidebarButton
            icon={expanded ? PanelLeftClose : PanelLeftOpen}
            label={expanded ? 'Hide labels' : 'Show labels'}
            expanded={expanded}
            onClick={toggleExpanded}
          />
        )}
        <SidebarButton icon={LogOut} label="Log out" expanded={isExpanded} onClick={handleLogout} />
      </div>
    </motion.aside>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  expanded,
  onClick,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  expanded: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Icon size={20} strokeWidth={1.75} className="shrink-0" />
      {expanded && <span className="truncate text-sm font-medium">{label}</span>}
    </button>
  );

  return expanded ? button : <Tooltip label={label}>{button}</Tooltip>;
}
