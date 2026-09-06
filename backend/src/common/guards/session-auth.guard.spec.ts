import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppSession, AuthService } from '../../auth/auth.service';
import { SessionAuthGuard } from './session-auth.guard';

function makeContext(headers: Record<string, string | string[] | undefined>): {
  context: ExecutionContext;
  request: { headers: typeof headers; session?: AppSession };
} {
  const request = { headers };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

const SESSION: AppSession = {
  tbUserId: 'u1',
  email: 'a@b.com',
  authority: 'CUSTOMER_USER',
  customerId: 'c1',
  appRole: 'ADMIN',
  tbToken: 'tb-token',
};

describe('SessionAuthGuard', () => {
  let guard: SessionAuthGuard;
  let reflector: Reflector;
  let authService: { getSession: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    authService = { getSession: jest.fn() };
    guard = new SessionAuthGuard(reflector, authService as unknown as AuthService);
  });

  it('lets a @Public() route through with no token check', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.getSession).not.toHaveBeenCalled();
  });

  it('rejects a request with no session token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid/expired session token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    authService.getSession.mockResolvedValue(null);
    const { context } = makeContext({ 'x-session-token': 'bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the resolved session to the request and passes for a valid token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    authService.getSession.mockResolvedValue(SESSION);
    const { context, request } = makeContext({ 'x-session-token': 'good-token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.getSession).toHaveBeenCalledWith('good-token');
    expect(request.session).toBe(SESSION);
  });

  it('uses the first value when the header arrives as an array', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    authService.getSession.mockResolvedValue(SESSION);
    const { context } = makeContext({ 'x-session-token': ['first-token', 'second-token'] });

    await guard.canActivate(context);
    expect(authService.getSession).toHaveBeenCalledWith('first-token');
  });
});
