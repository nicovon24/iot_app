# Infrastructure Rules

## Environment variables

Validated at startup via Zod (`backend/src/config/config.schema.ts`) — the app fails fast if required vars are missing or malformed. See `backend/.env.example`.

| Variable                       | Required | Default                  | Notes                                                            |
| ------------------------------ | :------: | ------------------------ | ---------------------------------------------------------------- |
| `THINGSBOARD_URL`              |   yes    | —                        | Base URL of the ThingsBoard instance (Cloud dev or local Docker) |
| `THINGSBOARD_ALLOWED_URLS`     |    no    | —                        | Additional operator-approved login origins, comma separated      |
| `DATABASE_URL`                 |   yes    | —                        | PostgreSQL connection for app metadata                           |
| `FRONTEND_URL`                 |    no    | `http://localhost:3000`  | Allowed CORS origin                                              |
| `AI_CREDENTIAL_ENCRYPTION_KEY` |    no    | —                        | Required when saving AI connections; 32-byte hex key             |
| `REDIS_URL`                    |    no    | `redis://localhost:6379` |                                                                  |
| `PORT`                         |    no    | `3001`                   |                                                                  |

The optional movement seed script uses `SEED_THINGSBOARD_USERNAME` and `SEED_THINGSBOARD_PASSWORD`. The server does not read those variables.

## ThingsBoard connection model

- End-user credentials are authenticated against an operator-approved ThingsBoard origin at login. REST and live telemetry use that user's token and origin.
- On a 401 from ThingsBoard, the backend refreshes the user's token once using the session refresh token.
- Frontend never holds a ThingsBoard token — only the app's own `x-session-token`, checked against Redis by `SessionAuthGuard`.

## Redis usage

Redis stores app sessions (`x-session-token` → `AppSession`, set at `/auth/login`).

No telemetry/attribute read-cache exists yet despite being planned in PROJECT.md — don't assume it's implemented; check `RedisService` usage before relying on it.

## Local/dev topology

- No Docker Compose file exists yet in this repo. Local dev currently points `THINGSBOARD_URL` at ThingsBoard Cloud (`https://thingsboard.cloud`, see `.env.example` default) rather than a local TB container.
- Backend runs standalone via `npm run start:dev` (Fastify adapter, listens on `0.0.0.0:<PORT>`); Redis must be reachable separately (local install or container — no compose wiring committed yet).
- If/when a local ThingsBoard container is added, document its compose service name and port mapping here before relying on it in scripts.

## Deploy

Not yet defined — no deploy target, CI, or hosting decision has been made (solo/local project, prototype stage). Update this section once a deploy path is chosen instead of assuming Vercel/Docker/etc.
