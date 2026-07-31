import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '../config/config.service';
import { RedisService } from '../thingsboard/redis.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { LoginDto } from './dto/login.dto';

const SESSION_PREFIX = 'app:session:';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly thingsboard: ThingsboardClientService,
  ) {}

  async login(dto: LoginDto): Promise<{ sessionToken: string }> {
    // V1 has a single shared ThingsBoard operator account (see PROJECT.md) —
    // the app credential check is against that configured account, not per-user TB logins.
    if (dto.username !== this.config.thingsboardUsername || dto.password !== this.config.thingsboardPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure ThingsBoard is reachable and the JWT cache is warm before issuing a session.
    await this.thingsboard.getToken();

    const sessionToken = randomUUID();
    await this.redis.set(`${SESSION_PREFIX}${sessionToken}`, dto.username, SESSION_TTL_SECONDS);
    return { sessionToken };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.redis.del(`${SESSION_PREFIX}${sessionToken}`);
  }

  async isValidSession(sessionToken: string): Promise<boolean> {
    const value = await this.redis.get(`${SESSION_PREFIX}${sessionToken}`);
    return value !== null;
  }
}
