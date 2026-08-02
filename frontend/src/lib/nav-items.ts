import {
  LayoutDashboard,
  Cpu,
  Boxes,
  Bell,
  Building2,
  UserCog,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Devices', href: '/devices', icon: Cpu },
  { label: 'Assets', href: '/assets', icon: Boxes },
  { label: 'Alarms', href: '/alarms', icon: Bell },
  { label: 'Clients', href: '/clients', icon: Building2, comingSoon: true },
  { label: 'Users', href: '/users', icon: UserCog, comingSoon: true },
  { label: 'Settings', href: '/settings', icon: Settings, comingSoon: true },
];
