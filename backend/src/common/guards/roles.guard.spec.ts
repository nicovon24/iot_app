import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppSession } from '../../auth/auth.service';
import { RolesGuard } from './roles.guard';

function makeContext(session?: AppSession): ExecutionContext {
  const request = { session };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const SYSADMIN_SESSION: AppSession = {
  tbUserId: 'u1',
  email: 'admin@b.com',
  authority: 'TENANT_ADMIN',
  customerId: null,
  appRole: null,
  tbToken: 'tb-token',
};

const CUSTOMER_SESSION: AppSession = {
  ...SYSADMIN_SESSION,
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'ADMIN',
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('passes when the route has no @Roles() metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext(CUSTOMER_SESSION))).toBe(true);
  });

  it('passes when @Roles() metadata is an empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    expect(guard.canActivate(makeContext(CUSTOMER_SESSION))).toBe(true);
  });

  it.each(['TENANT_ADMIN', 'SYS_ADMIN'] as const)(
    'allows %s authority when SYSADMIN is required',
    (authority) => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SYSADMIN']);
      const session = { ...SYSADMIN_SESSION, authority };
      expect(guard.canActivate(makeContext(session))).toBe(true);
    },
  );

  it('rejects a non-admin authority when SYSADMIN is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SYSADMIN']);
    expect(() => guard.canActivate(makeContext(CUSTOMER_SESSION))).toThrow(ForbiddenException);
  });

  it('rejects when SYSADMIN is required and there is no session', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SYSADMIN']);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
