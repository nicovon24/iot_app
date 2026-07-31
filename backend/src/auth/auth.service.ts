import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../thingsboard/redis.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { LoginDto } from './dto/login.dto';
import { TbAuthority } from '../types';

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
  ) {}

  async login(dto: LoginDto): Promise<{ sessionToken: string }> {
    // V1 (Phase 2.2): real ThingsBoard authentication — sysadmin is a pre-existing TB
    // Tenant Admin, admin/reader are TB Customer Users created via the users module.
    // No shared/config credential fallback.
    const { token, refreshToken } = await this.thingsboard.loginWithCredentials(dto.username, dto.password);
    const profile = await this.thingsboard.getUserProfile(token);

    const session: AppSession = {
      tbUserId: profile.id.id,
      email: profile.email,
      authority: profile.authority,
      customerId: profile.customerId?.id ?? null,
      appRole: profile.additionalInfo?.appRole ?? null,
      tbToken: token,
      tbRefreshToken: refreshToken,
    };

    const sessionToken = randomUUID();
    await this.redis.set(`${SESSION_PREFIX}${sessionToken}`, JSON.stringify(session), SESSION_TTL_SECONDS);
    return { sessionToken };
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
