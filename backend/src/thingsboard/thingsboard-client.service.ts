import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { RedisService } from './redis.service';
import { TbLoginResponse } from '../types';

const JWT_CACHE_KEY = 'tb:jwt';
const DEFAULT_TTL_SECONDS = 60 * 15;
const TTL_SAFETY_MARGIN_SECONDS = 30;

function decodeJwtExpiry(token: string): number | null {
  const [, payload] = token.split('.');
  if (!payload) return null;
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

async function parseJsonBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function throwForFailedResponse(response: Response): Promise<never> {
  const text = await response.text();
  let message = `ThingsBoard request failed: ${response.status}`;
  try {
    const parsed = text ? JSON.parse(text) : null;
    if (parsed?.message) message = parsed.message;
  } catch {
    // TB didn't return JSON — keep the generic message.
  }
  throw new HttpException(message, response.status);
}

@Injectable()
export class ThingsboardClientService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private async login(): Promise<string> {
    const response = await fetch(`${this.config.thingsboardUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.config.thingsboardUsername,
        password: this.config.thingsboardPassword,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to authenticate against ThingsBoard');
    }

    const body = (await response.json()) as TbLoginResponse;

    const expiry = decodeJwtExpiry(body.token);
    const ttl = expiry
      ? Math.max(expiry - Math.floor(Date.now() / 1000) - TTL_SAFETY_MARGIN_SECONDS, 1)
      : DEFAULT_TTL_SECONDS;

    await this.redis.set(JWT_CACHE_KEY, body.token, ttl);
    return body.token;
  }

  async getToken(): Promise<string> {
    const cached = await this.redis.get(JWT_CACHE_KEY);
    if (cached) return cached;
    return this.login();
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${this.config.thingsboardUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // Cached token expired/invalid server-side — drop cache and retry once.
      await this.redis.del(JWT_CACHE_KEY);
      const freshToken = await this.getToken();
      const retry = await fetch(`${this.config.thingsboardUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${freshToken}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!retry.ok) {
        await throwForFailedResponse(retry);
      }
      return parseJsonBody<T>(retry);
    }

    if (!response.ok) {
      await throwForFailedResponse(response);
    }

    return parseJsonBody<T>(response);
  }
}
