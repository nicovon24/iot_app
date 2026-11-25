# Infrastructure Rules

## Environment variables

Validated at startup via Zod (`backend/src/config/config.schema.ts`) — the app fails fast if required vars are missing or malformed. See `backend/.env.example`.

| Variable                       | Required | Default                  | Notes                                                                                       |
| ------------------------------ | :------: | ------------------------ | ------------------------------------------------------------------------------------------- |
| `THINGSBOARD_URL`              |   yes    | —                        | Base URL of the ThingsBoard instance (Cloud dev or local Docker)                            |
| `THINGSBOARD_ALLOWED_URLS`     |    no    | —                        | Additional operator-approved login origins, comma separated                                 |
| `DATABASE_URL`                 |   yes    | —                        | PostgreSQL connection for app metadata                                                      |
| `DIRECT_URL`                   |    no    | —                        | Optional direct PostgreSQL URL for migrations; Neon pooler URLs are converted automatically |
| `FRONTEND_URL`                 |    no    | `http://localhost:3000`  | Allowed CORS origin                                                                         |
| `AI_CREDENTIAL_ENCRYPTION_KEY` |    no    | —                        | Required when saving AI connections; 32-byte hex key                                        |
| `AI_ALLOWED_BASE_URLS`         |    no    | —                        | Approved origins for custom LLM endpoints, comma separated                                  |
| `REDIS_URL`                    |    no    | `redis://localhost:6379` |                                                                                             |
| `PORT`                         |    no    | `3001`                   |                                                                                             |

The optional movement seed script uses `SEED_THINGSBOARD_USERNAME` and `SEED_THINGSBOARD_PASSWORD`. The server does not read those variables.

## ThingsBoard connection model

- End-user credentials are authenticated against an operator-approved ThingsBoard origin at login. REST and live telemetry use that user's token and origin.
- On a 401 from ThingsBoard, the backend refreshes the user's token once using the session refresh token.
- Frontend never holds a ThingsBoard token — only the app's own `x-session-token`, checked against Redis by `SessionAuthGuard`.

## Redis usage

Redis stores app sessions (`x-session-token` → `AppSession`, set at `/auth/login`).

No telemetry/attribute read-cache exists yet despite being planned in PROJECT.md — don't assume it's implemented; check `RedisService` usage before relying on it.

## Local/dev topology

- `docker-compose.yml` runs PostgreSQL, Redis, the backend, and the frontend. Local development defaults to `https://thingsboard.cloud` for ThingsBoard.
- The backend can also run standalone via `npm run start:dev` (Fastify adapter, listens on `0.0.0.0:<PORT>`), with PostgreSQL and Redis reachable separately.

## Deploy

GitHub Actions runs lint, typecheck, tests, build, and formatting on pull requests and `main`. The frontend is hosted on Vercel and the backend on Render; their Git integration is configured outside this repository and must be checked in each service dashboard.

The backend `start:prod` command runs `migrate:deploy` before starting NestJS. When `DATABASE_URL` points to a pooled Neon host, the migration script uses the matching unpooled host. `DIRECT_URL` can be set explicitly and must match the same database and user. The script rejects other pooled or mismatched migration URLs. Keep the same `AI_CREDENTIAL_ENCRYPTION_KEY` across deploys so saved provider keys remain readable. Set `FRONTEND_URL` to the deployed frontend origin and the frontend's `NEXT_PUBLIC_API_BASE_URL` to the deployed backend origin.
