import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AppSession } from '../../auth/auth.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Blocks every mutating request from a READER-role Customer User (Phase 9.2).
 * `appRole` is only set on Customer Users (`additionalInfo.appRole`) — SYSADMIN/TENANT_ADMIN
 * sessions have `appRole: null`, so no separate bypass branch is needed here.
 */
@Injectable()
export class ReaderBlockGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest & { session?: AppSession }>();
    const session = request.session;
    if (!session) {
      // No session means SessionAuthGuard already let this through as a @Public() route.
      return true;
    }

    if (MUTATING_METHODS.has(request.method) && session.appRole === 'READER') {
      throw new ForbiddenException('Read-only account — this action is not permitted');
    }

    return true;
  }
}
