import type { HierarchyLevel } from '@/types/customer';

/** Default Client hierarchy — used as the ClientWizard's starting levels and as the Admin
 * panel's fallback column set before a Client's real hierarchy has loaded (or none is selected). */
export const DEFAULT_HIERARCHY_LEVEL_NAMES = ['Site', 'Area', 'Asset', 'Sensor'];

export const DEFAULT_HIERARCHY_LEVELS: HierarchyLevel[] = DEFAULT_HIERARCHY_LEVEL_NAMES.map((name, levelIndex) => ({
  levelIndex,
  name,
}));
