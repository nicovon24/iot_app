import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../thingsboard/redis.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { LoginDto } from './dto/login.dto';
import { TbAuthority, TbUserProfile } from '../types';

const SESSION_PREFIX = 'app:session:';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export interface AppSession {
  tbUserId: string;
  email: string;
  authority: TbAuthority;
  customerId: string | null;
  appRole: 'ADMIN' | 'READER' | null;
  tbToken: string;
  tbRefreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly redis: RedisService,
    private readonly thingsboard: ThingsboardClientService,
    private readonly prisma: PrismaService,
  ) {}

  private buildSession(profile: TbUserProfile, tbToken: string, tbRefreshToken: string): AppSession {
    return {
      tbUserId: profile.id.id,
      email: profile.email,
      authority: profile.authority,
      customerId: profile.customerId?.id ?? null,
      appRole: profile.additionalInfo?.appRole ?? null,
      tbToken,
      tbRefreshToken,
    };
  }

  async login(dto: LoginDto): Promise<{ sessionToken: string }> {
    // V1 (Phase 2.2): real ThingsBoard authentication — sysadmin is a pre-existing TB
    // Tenant Admin, admin/reader are TB Customer Users created via the users module.
    // No shared/config credential fallback.
    const { token, refreshToken } = await this.thingsboard.loginWithCredentials(dto.username, dto.password);
    const profile = await this.thingsboard.getUserProfile(token);
    const session = this.buildSession(profile, token, refreshToken);

    const sessionToken = randomUUID();
    await this.redis.set(`${SESSION_PREFIX}${sessionToken}`, JSON.stringify(session), SESSION_TTL_SECONDS);
    return { sessionToken };
  }

  async impersonate(impersonator: AppSession, targetUserId: string): Promise<{ sessionToken: string; logId: string }> {
    // Reuses the impersonator's own tbToken/tbRefreshToken rather than a second real TB login
    // for the target — consistent with this project's existing architecture where entity-scoped
    // TB calls already go through the shared service-account credential regardless of whose app
    // session is active (see STATE.md Blockers/Concerns).
    const target = await this.thingsboard.request<TbUserProfile>('GET', `/api/user/${targetUserId}`);
    const session = this.buildSession(target, impersonator.tbToken, impersonator.tbRefreshToken);

    const sessionToken = randomUUID();
    await this.redis.set(`${SESSION_PREFIX}${sessionToken}`, JSON.stringify(session), SESSION_TTL_SECONDS);

    const log = await this.prisma.impersonationLog.create({
      data: { impersonatorId: impersonator.tbUserId, targetUserId },
    });

    return { sessionToken, logId: log.id };
  }

  async endImpersonation(logId: string): Promise<void> {
    // The impersonated Redis session itself is not invalidated — it simply expires on its own
    // TTL, or the sysadmin's browser just stops using it once it swaps back. No live kill-switch
    // (explicit scope cut, see PLAN.md boundaries).
    // `updateMany` (not `update`) so a bad/already-processed logId surfaces as a clean 404
    // instead of an unhandled Prisma P2025 bubbling up as a raw 500.
    const { count } = await this.prisma.impersonationLog.updateMany({
      where: { id: logId },
      data: { endedAt: new Date() },
    });
    if (count === 0) {
      throw new NotFoundException(`Impersonation log ${logId} not found`);
    }
  }

  async logout(sessionToken: string): Promise<void> {
    await this.redis.del(`${SESSION_PREFIX}${sessionToken}`);
  }

  async isValidSession(sessionToken: string): Promise<boolean> {
    const value = await this.redis.get(`${SESSION_PREFIX}${sessionToken}`);
    return value !== null;
  }

  async getSession(sessionToken: string): Promise<AppSession | null> {
    const value = await this.redis.get(`${SESSION_PREFIX}${sessionToken}`);
    return value ? (JSON.parse(value) as AppSession) : null;
  }
}
