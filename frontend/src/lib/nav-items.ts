import {
  LayoutDashboard,
  Cpu,
  Boxes,
  Bell,
  Map,
  Building2,
  UserCog,
  Palette,
  Settings,
  ShieldCheck,
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
  { label: 'Admin', href: '/admin', icon: ShieldCheck },
  { label: 'Devices', href: '/devices', icon: Cpu },
  { label: 'Assets', href: '/assets', icon: Boxes },
  { label: 'Alarms', href: '/alarms', icon: Bell },
  { label: 'Maps', href: '/map', icon: Map },
  { label: 'Clients', href: '/clients', icon: Building2 },
  { label: 'Users', href: '/users', icon: UserCog, comingSoon: true },
  { label: 'White Label', href: '/white-label', icon: Palette, comingSoon: true },
  { label: 'Settings', href: '/settings', icon: Settings, comingSoon: true },
];
