---
phase: 04-client-wizard-hierarchy
plan: 01
subsystem: database
tags: [prisma, postgres, docker, nestjs]

requires:
  - phase: 01-backend-foundation
    provides: ConfigService env-validation pattern (redisUrl-style getters) to mirror for databaseUrl
provides:
  - Local Postgres via Docker (`iot-postgres` container)
  - Prisma schema — `Client` + `ClientHierarchyLevels` models, migrated
  - `PrismaModule`/`PrismaService` (global, DI-ready)
affects: [phase-4-plan-02, phase-7-client-wizard-ui]

tech-stack:
  added: ["prisma@6", "@prisma/client@6"]
  patterns: ["PrismaService extends PrismaClient with OnModuleInit/OnModuleDestroy lifecycle hooks, mirroring RedisService's OnModuleDestroy shape"]

key-files:
  created:
    - backend/prisma/schema.prisma
    - backend/prisma/migrations/20260801192315_init_client_hierarchy/migration.sql
    - backend/src/prisma/prisma.service.ts
    - backend/src/prisma/prisma.module.ts
  modified:
    - backend/.env
    - backend/.env.example
    - backend/src/config/config.schema.ts
    - backend/src/config/config.service.ts
    - backend/src/app.module.ts
    - backend/package.json

key-decisions:
  - "Postgres container mapped to host port 15432, not 5432 — three native Windows Postgres services were already bound to 5432/5433/5434, silently intercepting connections"
  - "Downgraded prisma/@prisma/client from 7 (installed by `npx prisma init`) to 6 — Prisma 7 forbids `url` in the datasource block for Migrate, requiring a driver-adapter/prisma.config.ts setup the plan didn't call for"
  - "Removed prisma-init-generated `.claude/skills/`, `.agents/`, `.windsurf/`, `skills-lock.json`, `prisma.config.ts` — unrequested scaffolding from Prisma 7's init flow, not part of this project's tooling"

patterns-established:
  - "PrismaService is the only place PrismaClient is instantiated; PrismaModule is @Global() so downstream modules (clients, etc.) inject it without re-importing"

duration: ~1 session (extended by port-conflict + Prisma-version debugging)
description: "Postgres + Prisma wired in: Client/ClientHierarchyLevels schema migrated, PrismaService DI-ready"
type: Summary
about: "iot-app"
---

# Phase 4 Plan 01: Prisma + Postgres Setup Summary

> **⚠️ Schema superseded same day (2026-08-01).** The `Client` model described below was removed later the same session — hierarchy levels are now keyed directly by a real ThingsBoard `customerId` (model `CustomerHierarchyLevels`), not a local `Client.id`. The infra work (Postgres container, port-conflict fix, Prisma version pin, `PrismaService`/`PrismaModule`) below is still accurate and unchanged; only the schema's table shape changed. See `.paul/phases/04-client-wizard-hierarchy/04-02-SUMMARY.md`'s superseded-note and STATE.md Decisions for the current design.

**Local Postgres running in Docker, Prisma schema for `Client`/`ClientHierarchyLevels` migrated against it, and a global `PrismaService` ready for 04-02 to inject — after working through a real port collision with 3 pre-existing native Windows Postgres services and a Prisma 7→6 downgrade.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Postgres reachable locally | Pass | `iot-postgres` container running, `pg_isready` confirms accepting connections, on host port 15432 (not 5432, see Deviations) |
| AC-2: Prisma schema matches narrow V1 scope | Pass | Exactly two models: `Client`, `ClientHierarchyLevels` (renamed from planned `HierarchyLevelDefinition` per user request mid-session) — no other tables |
| AC-3: Migration applies cleanly against real Postgres | Pass | `npx prisma migrate dev --name init_client_hierarchy` applied; verified via `psql \dt` inside the real container showing both tables + `_prisma_migrations` |
| AC-4: PrismaService is DI-ready | Pass | `PrismaModule` (`@Global()`) registered in `AppModule`; verified live — `nest start` logs `PrismaModule dependencies initialized` with no errors |

## Accomplishments

- Diagnosed and fixed a genuine environment bug: 3 native Windows PostgreSQL services (ports 5432, 5433, 5434) were silently intercepting Docker's port-forwarded connections, causing misleading "authentication failed" and "0 tables" symptoms despite Prisma reporting success
- Handled a Prisma major-version incompatibility (7 vs the plan's assumed classic `url=env(...)` datasource pattern) by pinning to Prisma 6, avoiding an unplanned driver-adapter migration
- Cleaned up unrequested scaffolding (`.claude/skills/`, `.agents/`, `.windsurf/`, `skills-lock.json`) that `npx prisma init` generated

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `backend/prisma/schema.prisma` | Created | `Client` + `ClientHierarchyLevels` models, `prisma-client-js` generator |
| `backend/prisma/migrations/20260801192315_init_client_hierarchy/` | Created | Initial migration, applied against real Postgres |
| `backend/src/prisma/prisma.service.ts` | Created | `PrismaClient` wrapper with connect/disconnect lifecycle hooks |
| `backend/src/prisma/prisma.module.ts` | Created | `@Global()` module exporting `PrismaService` |
| `backend/.env`, `.env.example` | Modified | Added `DATABASE_URL` (port 15432) |
| `backend/src/config/config.schema.ts`, `config.service.ts` | Modified | `DATABASE_URL` validation + `databaseUrl` getter, mirroring `redisUrl` |
| `backend/src/app.module.ts` | Modified | Registered `PrismaModule` |
| `backend/package.json` | Modified | Added `prisma`, `@prisma/client` (v6) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Postgres container on host port 15432 | Ports 5432/5433/5434 were all occupied by pre-existing native Windows Postgres services, causing connections to silently route to the wrong server | Any future local Postgres work on this machine should check `netstat` for occupied ports before assuming 5432 is free |
| Pinned `prisma`/`@prisma/client` to v6 | Prisma 7's `npx prisma init` default forbids `url` in the schema's datasource block for Migrate (requires driver adapters/`prisma.config.ts`) — a bigger architecture change than this plan scoped | Future Prisma upgrades should be a deliberate decision, not an incidental `npm install` side effect |
| Renamed model from planned `HierarchyLevelDefinition` to `ClientHierarchyLevels` | User-directed rename mid-session | Reflected across schema, service, controller, and both plan files |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Real environment bugs, not scope creep |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** Moderate debugging effort (port collision + Prisma major-version mismatch), zero scope creep — the final schema/module shape matches the plan exactly (aside from the user-directed model rename).

### Auto-fixed Issues

**1. Infra Port collision with native Windows Postgres services**
- **Found during:** Task 2 (migration failed with misleading auth errors, then reported success while creating zero tables)
- **Issue:** `netstat` showed native `postgres.exe` Windows services already bound to 5432, 5433, and 5434 — Docker's port-forwarding proxy and the native services both appeared to listen on the same ports, routing Prisma's connections to the wrong backend
- **Fix:** Moved the `iot-postgres` container to host port 15432, a genuinely free port; updated `DATABASE_URL` accordingly
- **Files:** `backend/.env`, `backend/.env.example`
- **Verification:** `netstat` confirmed only Docker's proxy on 15432; migration then applied and tables verified via `psql \dt`

**2. Tooling Prisma 7 incompatible with plan's assumed schema pattern**
- **Found during:** Task 2 (`npx prisma init` installed Prisma 7 by default; `prisma migrate dev` rejected `url = env("DATABASE_URL")` in the datasource block)
- **Issue:** Prisma 7 requires driver adapters or `prisma.config.ts` for Migrate's database URL — a materially different setup than the plan's simple classic pattern
- **Fix:** Downgraded to `prisma@6`/`@prisma/client@6`, restoring the classic datasource-url pattern; also removed the unrequested `.claude/skills/`, `.agents/`, `.windsurf/`, `skills-lock.json`, `prisma.config.ts` files `prisma init` had generated
- **Files:** `backend/package.json`, `backend/prisma/schema.prisma`
- **Verification:** `npx prisma migrate dev` succeeded cleanly on v6; `npx prisma migrate status` shows up to date

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Multiple native Windows Postgres services occupying 5432-5434 | Moved container to port 15432 |
| Prisma 7 breaking change on datasource `url` | Downgraded to Prisma 6 |

## Next Phase Readiness

**Ready:**
- Postgres running and migrated; `PrismaService` injectable and connection-tested via a real `nest start` boot
- 04-02 can proceed immediately — no blockers

**Concerns:**
- `iot-postgres` on a non-standard port (15432) — must be documented in STATE.md so future sessions don't assume 5432
- Prisma pinned to v6; do not `npm update` prisma packages without deliberately re-evaluating the v7 driver-adapter migration

**Blockers:** None

---
*Phase: 04-client-wizard-hierarchy, Plan: 01*
*Completed: 2026-08-01*
