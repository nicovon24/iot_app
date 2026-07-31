import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Currently only 'SYSADMIN' is checked (maps to TB's TENANT_ADMIN/SYS_ADMIN authority) — see RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
