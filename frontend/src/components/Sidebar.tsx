'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Tooltip } from '@heroui/react';
import { NAV_ITEMS } from '@/lib/nav-items';
import { logout } from '@/lib/auth';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col items-center gap-1 overflow-hidden bg-navy-950 py-6">
      <div className="mb-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
        IoT
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <Tooltip key={item.href} content={`${item.label} — Coming soon`} placement="right">
                <div className="flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-xl bg-navy-900/40 text-navy-800">
                  <Icon size={20} strokeWidth={1.75} className="text-slate-600" />
                </div>
              </Tooltip>
            );
          }

          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Tooltip key={item.href} content={item.label} placement="right">
              <Link
                href={item.href}
                aria-label={item.label}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={1.75} />
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      <Tooltip content="Log out" placement="right">
        <button
          type="button"
          aria-label="Log out"
          onClick={handleLogout}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-navy-900 hover:text-white"
        >
          <LogOut size={20} strokeWidth={1.75} />
        </button>
      </Tooltip>
    </aside>
  );
}
