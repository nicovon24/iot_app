import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AppSession } from '../../auth/auth.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { session?: AppSession }>();
    const session = request.session;

    if (required.includes('SYSADMIN') && (session?.authority === 'TENANT_ADMIN' || session?.authority === 'SYS_ADMIN')) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
