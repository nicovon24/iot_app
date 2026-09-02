import {
  Home,
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

/** Rail sections. The order here is the order they render. */
export type NavGroup = 'MONITORING' | 'INVENTORY' | 'ADMINISTRATION';

export const NAV_GROUPS: NavGroup[] = ['MONITORING', 'INVENTORY', 'ADMINISTRATION'];

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
  comingSoon?: boolean;
}

/**
 * The rail is grouped rather than flat: eleven undifferentiated entries gave the
 * eye nowhere to land, and the three groups answer three different questions —
 * what is happening now, what exists, and who may touch it.
 *
 * The order within each group is the design's, not the old flat list's. Admin
 * used to sit third overall, between two monitoring views, which put a
 * permissions screen in the middle of the operational path.
 */
export const NAV_ITEMS: NavItem[] = [
  // Two entries on purpose: Overview is the fixed fleet summary, Dashboards is the gallery of
  // user-built ones. They were the same route until the gallery needed a home.
  { label: 'Overview', href: '/', icon: Home, group: 'MONITORING' },
  { label: 'Dashboards', href: '/dashboard', icon: LayoutDashboard, group: 'MONITORING' },
  { label: 'Maps', href: '/map', icon: Map, group: 'MONITORING' },
  { label: 'Alarms', href: '/alarms', icon: Bell, group: 'MONITORING' },

  { label: 'Devices', href: '/devices', icon: Cpu, group: 'INVENTORY' },
  { label: 'Assets', href: '/assets', icon: Boxes, group: 'INVENTORY' },

  { label: 'Admin', href: '/admin', icon: ShieldCheck, group: 'ADMINISTRATION' },
  { label: 'Clients', href: '/clients', icon: Building2, group: 'ADMINISTRATION' },
  { label: 'Users', href: '/users', icon: UserCog, group: 'ADMINISTRATION' },
  {
    label: 'White Label',
    href: '/white-label',
    icon: Palette,
    group: 'ADMINISTRATION',
    comingSoon: true,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    group: 'ADMINISTRATION',
    comingSoon: true,
  },
];
