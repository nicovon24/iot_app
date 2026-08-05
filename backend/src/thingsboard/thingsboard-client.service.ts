import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { RedisService } from './redis.service';
import { TbLoginResponse, TbUserProfile } from '../types';

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

  /**
   * Authenticates the given end-user credentials directly against ThingsBoard.
   * Distinct from `login()`/`getToken()` (the backend's own service-account session,
   * never cached here) — used to resolve a real per-user tbUserId/authority/customerId at app login.
   */
  async loginWithCredentials(username: string, password: string): Promise<TbLoginResponse> {
    const response = await fetch(`${this.config.thingsboardUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return (await response.json()) as TbLoginResponse;
  }

  async getUserProfile(userToken: string): Promise<TbUserProfile> {
    const response = await fetch(`${this.config.thingsboardUrl}/api/auth/user`, {
      method: 'GET',
      headers: { 'X-Authorization': `Bearer ${userToken}` },
    });

    if (!response.ok) {
      await throwForFailedResponse(response);
    }

    return parseJsonBody<TbUserProfile>(response);
  }

  /** Same request contract as `request()`, but authenticated with a caller-supplied user token instead of the cached service-account token — no refresh-on-401 (the caller's session is invalid, not the service account's). */
  async requestWithToken<T>(userToken: string, method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.config.thingsboardUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${userToken}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      await throwForFailedResponse(response);
    }

    return parseJsonBody<T>(response);
  }

  /**
   * Same auth/refresh-on-401 contract as `request()`, but for TB endpoints that respond with a
   * raw plain-text body instead of JSON (e.g. `/api/user/:id/activationLink` returns the bare
   * URL string, not `{ value: "..." }` — found live, `parseJsonBody` crashed with a SyntaxError
   * trying to JSON.parse it).
   */
  async requestText(method: string, path: string): Promise<string> {
    const token = await this.getToken();
    const response = await fetch(`${this.config.thingsboardUrl}${path}`, {
      method,
      headers: { 'X-Authorization': `Bearer ${token}` },
    });

    if (response.status === 401) {
      await this.redis.del(JWT_CACHE_KEY);
      const freshToken = await this.getToken();
      const retry = await fetch(`${this.config.thingsboardUrl}${path}`, {
        method,
        headers: { 'X-Authorization': `Bearer ${freshToken}` },
      });
      if (!retry.ok) {
        await throwForFailedResponse(retry);
      }
      return retry.text();
    }

    if (!response.ok) {
      await throwForFailedResponse(response);
    }

    return response.text();
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
