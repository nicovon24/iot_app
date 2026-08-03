'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, type LucideProps } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav-items';
import { logout } from '@/lib/auth';
import { Tooltip } from './Tooltip';
import { useTheme } from '@/hooks/useTheme';

const SIDEBAR_STORAGE_KEY = 'iot_sidebar_expanded';

const DASHBOARD_OPTIONS = [{ label: 'Main Dashboard', href: '/dashboard', comingSoon: false }];

export function Sidebar({ visible = true }: { visible?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  const dashboardMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) setExpanded(stored === 'true');
  }, []);

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
      animate={{ width: visible ? (expanded ? 208 : 72) : 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex h-full shrink-0 flex-col overflow-hidden py-6"
      style={{ background: 'linear-gradient(180deg, var(--gradient-header-from), var(--gradient-header-to))' }}
    >
      <div className={`mb-6 flex items-center gap-2.5 ${expanded ? 'px-4' : 'justify-center'}`}>
        <Image src="/logo.png" alt="IoTArg logo" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" priority />
        {expanded && <span className="truncate text-sm font-semibold text-white">IoTArg</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isDashboard = item.href === '/dashboard';

          const row = (
            <div
              className={`relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 transition-colors ${
                item.comingSoon
                  ? 'cursor-not-allowed text-white/30'
                  : isActive
                    ? 'text-navy-950'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isActive && !item.comingSoon && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-white"
                  transition={{ duration: 0.2 }}
                />
              )}
              <Icon size={20} strokeWidth={1.75} className="relative z-10 shrink-0" />
              {expanded && <span className="relative z-10 flex-1 truncate text-sm font-medium">{item.label}</span>}
              {expanded && isDashboard && DASHBOARD_OPTIONS.length > 1 && (
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
                      return;
                    }
                    setDashboardMenuOpen((prev) => !prev);
                  }}
                  className="flex w-full items-center text-left"
                >
                  {expanded ? row : <Tooltip label="Dashboards">{row}</Tooltip>}
                </button>
                <AnimatePresence>
                  {dashboardMenuOpen && DASHBOARD_OPTIONS.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className={`absolute z-50 min-w-45 overflow-hidden rounded-lg bg-navy-950 py-1 shadow-lg ${
                        expanded ? 'left-0 top-full mt-1' : 'left-full top-0 ml-2'
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
            <Link href={item.href} aria-label={item.label}>
              {row}
            </Link>
          );

          return (
            <div key={item.href}>{expanded ? inner : <Tooltip label={tooltipLabel}>{inner}</Tooltip>}</div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 px-3">
        <SidebarButton
          icon={isDark ? Sun : Moon}
          label={isDark ? 'Light mode' : 'Dark mode'}
          expanded={expanded}
          onClick={toggleTheme}
        />
        <SidebarButton
          icon={expanded ? PanelLeftClose : PanelLeftOpen}
          label={expanded ? 'Hide labels' : 'Show labels'}
          expanded={expanded}
          onClick={toggleExpanded}
        />
        <SidebarButton icon={LogOut} label="Log out" expanded={expanded} onClick={handleLogout} />
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
