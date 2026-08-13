# IoT App

Industrial IoT platform built with NestJS and ThingsBoard. Flexible client-based hierarchies, dynamic intermediate asset modeling, an advanced data classifier, customizable alarms, and a scalable multi-dashboard frontend.

Proof of concept: ThingsBoard as the IoT data engine, with a frontend far more capable and flexible than its native UI. See [VISION.md](VISION.md) for the full product goal.

## Stack

| Layer | Technology |
| :--- | :--- |
| Backend | NestJS + Fastify, Prisma (PostgreSQL), Redis |
| IoT Engine | ThingsBoard Cloud / Docker |
| Frontend | Next.js (App Router) + TypeScript, Zustand, TanStack Query |
| Package Manager | npm workspaces |

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

- [AGENTS.md](AGENTS.md) — how to work in this repo, PAUL workflow
- [VISION.md](VISION.md) — product vision, business domain, scope
- [.paul/PROJECT.md](.paul/PROJECT.md) — current requirements, decisions, stack (source of truth)
- [.paul/ARCHITECTURE.md](.paul/ARCHITECTURE.md) — system design & ADR index
- [.paul/STATE.md](.paul/STATE.md) — living state (position, decisions, blockers)

## Getting started

Requires PostgreSQL and Redis running locally (or reachable), plus a ThingsBoard instance (cloud or Docker).

```bash
# backend
cd backend
cp .env.example .env   # fill in THINGSBOARD_URL/USERNAME/PASSWORD, REDIS_URL, DATABASE_URL
npm install             # runs `prisma generate` via postinstall
npx prisma migrate deploy
npm run start:dev       # http://localhost:3001

# frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:3000
```

Frontend env vars (optional, default to `localhost:3001`): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_BASE_URL`.

## Repo commands

| Command | Where | What |
| :--- | :--- | :--- |
| `npm run start:dev` | `backend/` | Dev server, watch mode |
| `npm run build` | `backend/` | Compile (`nest build`) |
| `npm run start:prod` | `backend/` | Run compiled build (`dist/main.js`) |
| `npx prisma migrate deploy` | `backend/` | Apply DB migrations |
| `npx prisma studio` | `backend/` | Browse the DB |
| `npm run dev` | `frontend/` | Dev server (Next.js, Turbopack) |
| `npm run build` | `frontend/` | Production build |
| `npm run start` | `frontend/` | Run production build |
| `npx tsc --noEmit` | either | Type-check without emitting |
