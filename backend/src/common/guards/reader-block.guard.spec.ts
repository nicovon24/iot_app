import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AppSession } from '../../auth/auth.service';
import { ReaderBlockGuard } from './reader-block.guard';

function makeContext(method: string, session?: AppSession): ExecutionContext {
  const request = { method, session };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const READER: AppSession = {
  tbUserId: 'u1',
  email: 'reader@b.com',
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'READER',
  tbToken: 'tb-token',
};

const ADMIN: AppSession = { ...READER, appRole: 'ADMIN' };

describe('ReaderBlockGuard', () => {
  const guard = new ReaderBlockGuard();

  it('passes through when there is no session (public route)', () => {
    expect(guard.canActivate(makeContext('POST', undefined))).toBe(true);
  });

  it('always allows GET, even for a READER', () => {
    expect(guard.canActivate(makeContext('GET', READER))).toBe(true);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'blocks a READER from a mutating %s request',
    (method) => {
      expect(() => guard.canActivate(makeContext(method, READER))).toThrow(ForbiddenException);
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('allows a non-READER %s request', (method) => {
    expect(guard.canActivate(makeContext(method, ADMIN))).toBe(true);
  });
});
