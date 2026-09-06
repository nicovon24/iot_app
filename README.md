# IoT App

Industrial IoT platform built with NestJS and ThingsBoard. Flexible client-based hierarchies, dynamic intermediate asset modeling, an advanced data classifier, customizable alarms, and a scalable multi-dashboard frontend.

Proof of concept: ThingsBoard as the IoT data engine, with a frontend far more capable and flexible than its native UI. See [VISION.md](VISION.md) for the full product goal.

## Stack

| Layer           | Technology                                                 |
| :-------------- | :--------------------------------------------------------- |
| Backend         | NestJS + Fastify, Prisma (PostgreSQL), Redis               |
| IoT Engine      | ThingsBoard Cloud / Docker                                 |
| Frontend        | Next.js (App Router) + TypeScript, Zustand, TanStack Query |
| Package Manager | npm workspaces                                             |

See `.paul/PROJECT.md` for the authoritative stack table and rationale.

## Layout

```
iot_app/
├── backend/    # NestJS backend
├── frontend/   # Next.js frontend
├── .paul/      # PAUL: PROJECT/ROADMAP/STATE, phases, architecture, domain rules
└── docs/       # ADRs, changelog, historical intake docs
```

## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — lint/typecheck/format, pre-commit hook, PR checklist
- [AGENTS.md](AGENTS.md) — how to work in this repo, PAUL workflow
- [VISION.md](VISION.md) — product vision, business domain, scope
- [.paul/PROJECT.md](.paul/PROJECT.md) — current requirements, decisions, stack (source of truth)
- [.paul/ARCHITECTURE.md](.paul/ARCHITECTURE.md) — system design & ADR index
- [.paul/STATE.md](.paul/STATE.md) — living state (position, decisions, blockers)

## Getting started

Requires Docker (for Postgres and Redis) and a ThingsBoard instance (cloud or Docker).

The compose Postgres is published on host port **15432**, not 5432, so it doesn't
collide with a locally installed Postgres — `DATABASE_URL` must use 15432. Redis is
on the standard 6379.

```bash
# 1. install — ONCE, from the repo root. This is an npm workspaces monorepo;
#    running `npm install` inside backend/ or frontend/ produces a partial tree.
npm install             # installs both workspaces, runs `prisma generate`

# 2. infrastructure — Postgres on host port 15432, Redis on 6379
docker compose up -d postgres redis

# 3. backend
cd backend
cp .env.example .env    # fill in THINGSBOARD_URL/USERNAME/PASSWORD
npx prisma migrate deploy
npm run start:dev       # http://localhost:3001

# 4. frontend (separate terminal, from the repo root)
cd frontend
npm run dev             # http://localhost:3000
```

Frontend env vars (optional, default to `localhost:3001`): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_BASE_URL`.

## Docker

The whole stack (Postgres, Redis, backend, frontend) can run in Docker via [docker-compose.yml](docker-compose.yml). Each service also has a standalone image you can build and run on its own.

### Full stack

```bash
cp backend/.env.example backend/.env   # fill in THINGSBOARD_URL/USERNAME/PASSWORD
docker compose up -d --build
```

| Service    | Image name               | Port         | Notes                                                 |
| :--------- | :----------------------- | :----------- | :---------------------------------------------------- |
| `postgres` | `postgres:16-alpine`     | `15432:5432` | Named volume `postgres_data`                          |
| `redis`    | `redis:7-alpine`         | `6379:6379`  | Named volume `redis_data`                             |
| `backend`  | `iot_app-backend:local`  | `3001:3001`  | Built from [backend/Dockerfile](backend/Dockerfile)   |
| `frontend` | `iot_app-frontend:local` | `3000:3000`  | Built from [frontend/Dockerfile](frontend/Dockerfile) |

Then open `http://localhost:3000`. Backend Swagger docs: `http://localhost:3001/api/docs`.

`docker compose ps` shows health status; `docker compose logs -f backend` (or `frontend`) tails logs.

To stop: `docker compose down` (add `-v` to also wipe the Postgres/Redis volumes).

### Rebuilding after code or env changes

- Backend/frontend **source code** changed → `docker compose up -d --build backend frontend` (or just the one service).
- **`NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_BASE_URL`** changed → these are baked into the frontend JS bundle at build time, not read at container runtime. Editing `docker-compose.yml`'s `frontend.build.args` requires a rebuild to take effect: `docker compose build --no-cache frontend && docker compose up -d frontend`.
- **`backend/.env`** changed → `docker compose up -d backend` is enough (env is read at container start, no rebuild needed). Note `docker-compose.yml` overrides `REDIS_URL`, `DATABASE_URL`, `FRONTEND_URL`, and `PORT` from `backend/.env` to point at the in-network `redis`/`postgres` hostnames and the published `3001` port — a stray `PORT` in `.env` will not leak through.

### Building a single image standalone (no compose)

Both Dockerfiles build from the **monorepo root** as context (they `COPY` from `backend/` and `frontend/` and rely on the npm workspace's root `package.json`/`package-lock.json`), so always run `docker build` from `iot_app/`, not from inside `backend/`/`frontend/`.

```bash
# backend image
docker build -f backend/Dockerfile -t iot_app-backend:local .
docker run -p 3001:3001 --env-file backend/.env \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:15432/iot_app \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  iot_app-backend:local

# frontend image — API/WS URLs are build args, must be reachable from the browser
docker build -f frontend/Dockerfile -t iot_app-frontend:local \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 \
  --build-arg NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001 \
  .
docker run -p 3000:3000 iot_app-frontend:local
```

Standalone Postgres/Redis, if not using compose:

```bash
docker run -d --name iot_app_postgres -p 15432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=iot_app \
  -v iot_app_postgres_data:/var/lib/postgresql/data postgres:16-alpine

docker run -d --name iot_app_redis -p 6379:6379 -v iot_app_redis_data:/data redis:7-alpine
```

## Repo commands

| Command                     | Where       | What                                |
| :-------------------------- | :---------- | :---------------------------------- |
| `npm run start:dev`         | `backend/`  | Dev server, watch mode              |
| `npm run build`             | `backend/`  | Compile (`nest build`)              |
| `npm run start:prod`        | `backend/`  | Run compiled build (`dist/main.js`) |
| `npx prisma migrate deploy` | `backend/`  | Apply DB migrations                 |
| `npx prisma studio`         | `backend/`  | Browse the DB                       |
| `npm run dev`               | `frontend/` | Dev server (Next.js, Turbopack)     |
| `npm run build`             | `frontend/` | Production build                    |
| `npm run start`             | `frontend/` | Run production build                |
| `npx tsc --noEmit`          | either      | Type-check without emitting         |
