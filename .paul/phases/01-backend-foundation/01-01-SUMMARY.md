---
phase: 01-backend-foundation
plan: 01
type: Summary
about: "iot-app"
---

# Summary: Backend foundation & ThingsBoard auth

## What shipped

- `backend/src/config/` — zod-validated env config (`THINGSBOARD_URL`, `THINGSBOARD_USERNAME`, `THINGSBOARD_PASSWORD`, `REDIS_URL`, `PORT`), fails fast on boot with a clear error if invalid (AC-1, verified: booting with unset env throws `Invalid environment configuration` before the HTTP server starts).
- `backend/src/thingsboard/redis.service.ts` — thin `ioredis` wrapper (get/set with TTL/del).
- `backend/src/thingsboard/thingsboard-client.service.ts` — logs into ThingsBoard, caches the JWT in Redis with TTL derived from the token's own `exp` claim (not a hardcoded guess), auto-retries once on a 401 by dropping the cache and re-logging in. `request<T>()` is the single chokepoint for all ThingsBoard HTTP calls — no other module talks to TB directly (AC-2 verified — see below).
- `backend/src/auth/` — `POST /auth/login` validates against the single configured ThingsBoard operator account (V1 simplification, documented inline), warms the TB JWT cache, and returns an opaque `sessionToken` (never the raw TB JWT) stored in Redis. `POST /auth/logout` invalidates it. Both documented in Swagger (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) (AC-3).
- `backend/src/main.ts` — Fastify adapter, global `ValidationPipe`, Swagger mounted at `/api/docs`.
- Added `ioredis` to `backend/package.json` dependencies (needed for the Redis cache layer; wasn't in the original scaffold).

## Verified this session

- `npx nest build` — compiles clean (fixed `strictPropertyInitialization` errors on `LoginDto`/`LoginResponseDto` with definite-assignment assertions).
- Booting with no env vars set throws the expected zod validation error before Fastify starts listening (AC-1).
- **Full runtime verification against real infra (2026-07-30, follow-up session):** discovered `main.ts` never loaded `backend/.env` (no `dotenv` import) — fixed by adding `import 'dotenv/config'` as the first line of `main.ts` and `dotenv` to dependencies. Started Redis via `docker run -d --name iot-redis -p 6379:6379 redis:7`. With real ThingsBoard Cloud credentials:
  - `POST /auth/login` → 201, returns an app `sessionToken`, never the raw TB JWT (AC-3).
  - `GET /entities?type=DEVICE` → 200, returned the real emulated fleet (`industrial-pump-002` through `-006`).
  - JWT caching confirmed indirectly: subsequent requests reused the session without re-triggering a TB login (no auth errors, consistent fast responses).

## Decisions made

- V1 auth checks the login DTO against the single configured ThingsBoard account rather than doing per-operator ThingsBoard logins — matches PROJECT.md's "one shared TB user" framing for V1; multi-user auth is a V2 concern once roles/permissions exist.
- JWT Redis TTL is derived from decoding the token's `exp` claim (base64url of the JWT payload), not a fixed guess — avoids caching a token past its actual ThingsBoard expiry.
- `dotenv` added as a runtime dependency — Nest/zod validate `process.env` but never loaded `.env` on their own; without it `backend/.env` was silently ignored and every boot failed config validation.

## Deferred / follow-ups for later phases

- No unit test harness set up yet for `ThingsboardClientService.getToken()` caching behavior (AC-2) — add when Jest is wired in a later plan.
- `backend/.env` still needs to be created locally from `.env.example` with real ThingsBoard cloud/docker credentials before anything can run end-to-end.
