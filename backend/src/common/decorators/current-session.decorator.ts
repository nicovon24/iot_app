import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AppSession } from '../../auth/auth.service';

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppSession | null => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { session?: AppSession }>();
    return request.session ?? null;
  },
);
