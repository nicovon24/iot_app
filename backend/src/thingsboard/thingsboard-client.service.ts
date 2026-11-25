import {
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { RedisService } from './redis.service';
import { TbLoginResponse, TbUserProfile } from '../types';
import { currentThingsboardSession } from './thingsboard-context';

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

  get defaultUrl(): string {
    return this.config.thingsboardUrl.replace(/\/$/, '');
  }

  validateUrl(input: string): string {
    let normalized: string;
    try {
      const url = new URL(input);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/' ||
        !['http:', 'https:'].includes(url.protocol) ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
      ) {
        throw new Error('Unexpected URL components');
      }
      normalized = url.origin;
    } catch {
      throw new BadRequestException('Invalid ThingsBoard URL');
    }
    if (!this.config.thingsboardAllowedUrls.includes(normalized)) {
      throw new BadRequestException('ThingsBoard URL is not allowed');
    }
    return normalized;
  }

  private baseUrl(): string {
    return currentThingsboardSession()?.thingsboardUrl ?? this.defaultUrl;
  }

  private async refreshUserToken(): Promise<string> {
    const session = currentThingsboardSession();
    if (!session?.tbRefreshToken) throw new UnauthorizedException('ThingsBoard session expired');
    const response = await fetch(`${this.baseUrl()}/api/auth/token`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.tbRefreshToken }),
    });
    if (!response.ok) throw new UnauthorizedException('ThingsBoard session expired');
    const fresh = (await response.json()) as TbLoginResponse;
    session.tbToken = fresh.token;
    session.tbRefreshToken = fresh.refreshToken;
    if (session.appSessionToken) {
      const { appSessionToken, ...persisted } = session;
      await this.redis.set(
        `app:session:${appSessionToken}`,
        JSON.stringify(persisted),
        60 * 60 * 8,
      );
    }
    return fresh.token;
  }

  async getToken(): Promise<string> {
    const session = currentThingsboardSession();
    if (!session) throw new UnauthorizedException('ThingsBoard session required');
    const exp = decodeJwtExpiry(session.tbToken);
    if (exp && exp <= Math.floor(Date.now() / 1000) + 30) {
      return this.refreshUserToken();
    }
    return session.tbToken;
  }

  /**
   * Authenticates the given end-user credentials directly against ThingsBoard.
   * Resolves the caller's ThingsBoard identity before creating an app session.
   */
  async loginWithCredentials(
    username: string,
    password: string,
    url = this.defaultUrl,
  ): Promise<TbLoginResponse> {
    const response = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return (await response.json()) as TbLoginResponse;
  }

  async getUserProfile(userToken: string, url = this.defaultUrl): Promise<TbUserProfile> {
    const response = await fetch(`${url}/api/auth/user`, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'X-Authorization': `Bearer ${userToken}` },
    });

    if (!response.ok) {
      await throwForFailedResponse(response);
    }

    return parseJsonBody<TbUserProfile>(response);
  }

  /** Same request contract as `request()`, but authenticated with a caller-supplied user token. */
  async requestWithToken<T>(
    userToken: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method,
      redirect: 'manual',
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
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method,
      redirect: 'manual',
      headers: { 'X-Authorization': `Bearer ${token}` },
    });

    if (response.status === 401) {
      const freshToken = await this.refreshUserToken();
      const retry = await fetch(`${this.baseUrl()}${path}`, {
        method,
        redirect: 'manual',
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
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method,
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // Cached token expired/invalid server-side — drop cache and retry once.
      const freshToken = await this.refreshUserToken();
      const retry = await fetch(`${this.baseUrl()}${path}`, {
        method,
        redirect: 'manual',
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
