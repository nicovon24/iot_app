# Infrastructure Rules

## Environment variables

Validated at startup via Zod (`backend/src/config/config.schema.ts`) — the app fails fast if required vars are missing or malformed. See `backend/.env.example`.

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `THINGSBOARD_URL` | yes | — | Base URL of the ThingsBoard instance (Cloud dev or local Docker) |
| `THINGSBOARD_USERNAME` | yes | — | Service-account login for the backend's own cached session (not an end-user's) |
| `THINGSBOARD_PASSWORD` | yes | — | |
| `REDIS_URL` | no | `redis://localhost:6379` | |
| `PORT` | no | `3001` | |

Never commit real `THINGSBOARD_USERNAME`/`PASSWORD` values — `.env` is local-only, `.env.example` stays blank.

## ThingsBoard connection model

- One shared **service-account session** (`ThingsboardClientService.getToken()`) is cached in Redis under `tb:jwt`, reused for all backend→TB calls that aren't on behalf of a specific end-user. TTL is derived from the JWT's own `exp` claim minus a 30s safety margin, falling back to 15 min if `exp` can't be decoded.
- On a 401 from TB, the cached token is dropped and login is retried exactly once (`ThingsboardClientService.request()`) — no further retry loop.
- **End-user credentials** (`loginWithCredentials`) are authenticated directly against TB per login and never cached by the service-account path — they produce the app's own session (see `auth.service.ts`), stored separately.
- Frontend never holds a ThingsBoard token — only the app's own `x-session-token`, checked against Redis by `SessionAuthGuard`.

## Redis usage

Two distinct concerns share the same Redis instance in V1:
1. ThingsBoard service-account JWT cache (`tb:jwt`).
2. App session store (`x-session-token` → `AppSession`, set at `/auth/login`).

No telemetry/attribute read-cache exists yet despite being planned in PROJECT.md — don't assume it's implemented; check `RedisService` usage before relying on it.

## Local/dev topology

- No Docker Compose file exists yet in this repo. Local dev currently points `THINGSBOARD_URL` at ThingsBoard Cloud (`https://thingsboard.cloud`, see `.env.example` default) rather than a local TB container.
- Backend runs standalone via `npm run start:dev` (Fastify adapter, listens on `0.0.0.0:<PORT>`); Redis must be reachable separately (local install or container — no compose wiring committed yet).
- If/when a local ThingsBoard container is added, document its compose service name and port mapping here before relying on it in scripts.

## Deploy

Not yet defined — no deploy target, CI, or hosting decision has been made (solo/local project, prototype stage). Update this section once a deploy path is chosen instead of assuming Vercel/Docker/etc.
