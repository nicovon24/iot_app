import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../thingsboard/redis.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { LoginDto } from './dto/login.dto';
import { TbAuthority, TbUserProfile } from '../types';
import { currentInstance } from '../thingsboard/instance-scope';
import { ConfigService } from '../config/config.service';

const SESSION_PREFIX = 'app:session:';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export interface AppSession {
  tbUserId: string;
  email: string;
  authority: TbAuthority;
  customerId: string | null;
  appRole: 'ADMIN' | 'READER' | null;
  tbToken: string;
  tbRefreshToken?: string;
  thingsboardUrl?: string;
  appSessionToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly redis: RedisService,
    private readonly thingsboard: ThingsboardClientService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // The ThingsBoard refresh token used to be stored here and was never read by
  // anything: requestWithToken documents that it deliberately does not refresh on
  // 401, so the field looked like a working refresh mechanism while doing nothing.
  // Dropped rather than left as misleading state — reintroduce it together with an
  // actual refresh path if per-user TB calls ever need one.
  private buildSession(
    profile: TbUserProfile,
    tbToken: string,
    thingsboardUrl: string,
    tbRefreshToken?: string,
  ): AppSession {
    return {
      tbUserId: profile.id.id,
      email: profile.email,
      authority: profile.authority,
      customerId: profile.customerId?.id ?? null,
      appRole: profile.additionalInfo?.appRole ?? null,
      tbToken,
      tbRefreshToken,
      thingsboardUrl,
    };
  }

  async login(dto: LoginDto): Promise<{ sessionToken: string }> {
    // V1 (Phase 2.2): real ThingsBoard authentication — sysadmin is a pre-existing TB
    // Tenant Admin, admin/reader are TB Customer Users created via the users module.
    // No shared/config credential fallback.
    const thingsboardUrl = this.thingsboard.validateUrl(dto.thingsboardUrl);
    const { token, refreshToken } = await this.thingsboard.loginWithCredentials(
      dto.username,
      dto.password,
      thingsboardUrl,
    );
    const profile = await this.thingsboard.getUserProfile(token, thingsboardUrl);
    const session = this.buildSession(profile, token, thingsboardUrl, refreshToken);

    const sessionToken = randomUUID();
    await this.redis.set(
      `${SESSION_PREFIX}${sessionToken}`,
      JSON.stringify(session),
      SESSION_TTL_SECONDS,
    );
    return { sessionToken };
  }

  async impersonate(
    impersonator: AppSession,
    targetUserId: string,
  ): Promise<{ sessionToken: string; logId: string }> {
    // The impersonated session keeps the administrator's token for ThingsBoard requests.
    const target = await this.thingsboard.request<TbUserProfile>(
      'GET',
      `/api/user/${targetUserId}`,
    );
    const session = this.buildSession(
      target,
      impersonator.tbToken,
      impersonator.thingsboardUrl ?? this.thingsboard.defaultUrl,
      impersonator.tbRefreshToken,
    );

    const sessionToken = randomUUID();
    await this.redis.set(
      `${SESSION_PREFIX}${sessionToken}`,
      JSON.stringify(session),
      SESSION_TTL_SECONDS,
    );

    const log = await this.prisma.impersonationLog.create({
      data: { impersonatorId: impersonator.tbUserId, targetUserId, instanceUrl: currentInstance(this.config) },
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
    const key = `${SESSION_PREFIX}${sessionToken}`;
    const value = await this.redis.get(key);
    if (!value) return null;

    // Sliding expiry. The TTL used to be absolute, so an actively working user was
    // logged out mid-task exactly 8h after signing in. Every authenticated request
    // passes through here, so refreshing it keeps active sessions alive while an
    // abandoned one still expires on schedule.
    await this.redis.expire(key, SESSION_TTL_SECONDS);
    return { ...(JSON.parse(value) as AppSession), appSessionToken: sessionToken };
  }
}
