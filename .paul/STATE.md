---
description: "iot_app — current position and accumulated context"
type: ProjectState
about: "iot-app"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-07-30)

**Core value:** Industrial operators can view live and historical telemetry/attributes/alarms for any entity, on a frontend far more flexible than ThingsBoard's native UI, without ThingsBoard credentials ever reaching the browser.
**Current focus:** Version 1, Phase 2.2 — TB-native users & customer-hierarchy scoping (sysadmin/admin/reader)

## Current Position

Milestone: Version 1 (v1.0)
Phase: 2.2 of 7 (+2 inserted phases: 2.1 complete, 2.2 not started) (TB-native users & customer-hierarchy scoping)
Plan: 0 in current phase
Status: Phase 2.1 complete; code review of Phase 2.1 (CR-01/CR-02) plus user-clarified permissions model produced Phase 2.2, inserted ahead of Phase 3
Last activity: 2026-07-31 — Committed Phases 1/2/2.1 scaffold, fixed ioredis unhandled error events in `redis.service.ts`, scoped and inserted Phase 2.2

Progress:
- Milestone: [███░░░░░░░] 36%
- Phase 2.1: [██████████] 100%
- Phase 2.2: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 2.1 complete - Phase 2.2 scoped, ready for PLAN]
```

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total Time | Avg/Plan |
|-------|-------|------------|----------|
| 01-backend-foundation | 1/1 | - | - |
| 02-dynamic-entities-api | 1/1 | - | - |
| 02.1-extended-entities-api | 1/1 | - | - |

**Recent Trend:**
- Last 5 plans: 01-01, 02-01, 02.1-01
- Trend: -

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Redis included from V1, not deferred | Pre-planning | JWT + telemetry/attribute cache is part of Phase 1/2 scope, not a later add-on |
| Postgres/Prisma scoped to hierarchy + Client only in V1 | Pre-planning | Phase 4 only touches `hierarchy_level_definitions`, no other tables |
| Client-creation wizard is the only V1 wizard, hierarchy immutable after creation | Pre-planning | Phase 4/7 scope is intentionally narrow — no hierarchy-edit endpoint/UI |
| Frontend is Next.js App Router | Pre-planning | Phases 5-7 scaffolded as Next.js, not Vite+React |
| Swagger is the only API testing tool for REST (no Bruno/Postman) | Pre-planning | Every REST endpoint plan in Phases 1-4 includes "+ Swagger docs" as an explicit deliverable |
| V1 auth checked login DTO against the single configured TB account (no per-user TB logins) — **superseded by Phase 2.2** | Phase 1 | Was a deliberate V1 simplification; code review after Phase 2.1 (CR-01/CR-02) showed it leaves every session equally privileged with no customer boundary, so Phase 2.2 replaces it with real TB-native login |
| Users are TB-native (sysadmin = TB Tenant Admin, admin/reader = TB Customer Users), no app-owned users table | Phase 2.2 (scoping) | App stays complementary to ThingsBoard identity, not a second source of truth |
| V1 permission scoping follows the ThingsBoard customer hierarchy: sysadmin sees everything, a customer user sees its own customer + descendant sub-customers. No área/asset-level granularity (TB CE has no Entity Groups) | Phase 2.2 (scoping) | Matches the user's clarified model and TB CE's actual capabilities; finer-than-hierarchy scoping stays deferred (see Deferred Issues) rather than inventing a parallel Postgres permission system now |
| JWT Redis TTL derived from decoding the token's own `exp` claim | Phase 1 | Avoids caching a token past its real ThingsBoard expiry |
| `dotenv` added; `main.ts` must `import 'dotenv/config'` first | Phase 1 (fix) | Without it `backend/.env` is silently ignored — config validation fails even with a correct `.env` present |
| `ThingsboardClientService.request()` is the only chokepoint for TB HTTP calls | Phase 1 | Enforced going into Phase 2 — entities/attributes/telemetry modules must go through it, never construct their own HTTP client |
| No `telemetry_definitions`/unit-conversion catalog built in V1 REST | Phase 2 | `decimals` field stays `undefined` rather than faked; real catalog is a later concern per ARCHITECTURE.md |
| Aggregation always forwarded to ThingsBoard's own API, never computed locally | Phase 2 | `telemetry/timeseries?agg=` passes straight through; enforced boundary for Phase 3+ too |
| Bare Device/Asset creation moved into V1 (Phase 2.1); Client/hierarchy linking of created entities stays V2 | Phase 2.1 | `POST /devices`/`POST /assets` create an unlinked TB entity; wiring it to a Client/Asset is still the V2 wizard's job, not duplicated here |
| Session auth guard is global via `APP_GUARD`, `@Public()` only on `POST /auth/login` | Phase 2.1 | Every current and future controller is protected by default — verified: `GET /entities` returns 401 with no token, 200 with a valid one |
| Timeseries `interval` bug fixed: `agg` was silently setting `interval = endTs - startTs` (Phase 2 code), collapsing bucketed aggregation into one point | Phase 2.1 | Verified fixed: `agg=AVG&interval=300000` over 1h now returns 12 distinct 5-min-bucket averages, not 1 |
| `ThingsboardClientService.request()` now propagates TB's real HTTP status/message instead of always throwing 500 | Phase 2.1 (fix) | Needed to diagnose the device-creation 403 ("Maximum allowed devices limit reached!") during verification — a real TB Cloud account limit, not a bug |
| `RedisService` now attaches an `error` listener + `retryStrategy`/`maxRetriesPerRequest` | Post-2.1 (fix) | ioredis throws unhandled "error event" crashes without a listener on connection failure; now logged via Nest `Logger` and retried with backoff instead |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Device/Asset-to-Client/Asset linking wizard | Roadmap scoping | M | Version 2 |
| Área/asset-level permission granularity (finer than customer hierarchy) | Roadmap scoping / Phase 2.2 clarification | M | Version 2 — no design chosen, TB CE has no Entity Groups to back it |
| User-editable dashboards (react-grid-layout) | Roadmap scoping | L | Version 2 |
| No Jest test harness yet for `ThingsboardClientService`/cache-hit/auth-guard behavior | Phase 1-2.1 | S | When Jest is wired in a later plan (manual runtime verification already done against real TB+Redis for all of Phases 1, 2, 2.1) |
| No DELETE endpoints for devices/assets/customers | Phase 2.1 | S | Add if V2 wizards need entity deletion |
| Phase 6 telemetry widget needs an interval picker to use the new `agg`/`interval` params | Phase 2.1 | S | When Phase 6 (frontend entity views) is planned |

### Blockers/Concerns

- None active. ThingsBoard Cloud credentials confirmed working, Redis running via `docker run -d --name iot-redis -p 6379:6379 redis:7` (container name `iot-redis` — restart with `docker start iot-redis` next session, it won't survive a machine reboot unless Docker Desktop is set to start it).

## Boundaries (Active)

- `backend/src/thingsboard/thingsboard-client.service.ts` — do not bypass; all TB HTTP calls go through `request<T>()`
- `backend/src/thingsboard/thingsboard.types.ts` — raw TB shapes, extend rather than duplicate
- `backend/src/entities/entities.service.ts` — the only place that maps `TbDevice`/`TbAsset`/`TbCustomer` to `EntityRef`; devices/assets/customers controllers must stay thin wrappers over it
- `backend/src/common/guards/session-auth.guard.ts` — global via `APP_GUARD`; new controllers are protected by default, only opt out with `@Public()` on a specific handler, never module-wide

## Session Continuity

Last session: 2026-07-31
Stopped at: Phase 2.1 scaffold (Phases 1/2/2.1) committed to git as-is. Code review of Phase 2.1 found two real gaps (CR-01: unvalidated `:id` path traversal against TB; CR-02: unescaped query params in `attributes`/`telemetry` services) plus the deeper architectural finding that the shared-account auth model gives every session equal privilege. Follow-up conversation with the user clarified the target model (TB-native sysadmin/admin/reader, scoping by TB customer hierarchy, CE confirmed — no Entity Groups) and inserted Phase 2.2 into the roadmap, scoped in `.paul/ROADMAP.md`. Also fixed an unrelated bug: `RedisService` had no `error` listener, causing ioredis to throw unhandled error events on connection failure.
Next action: `/paul:plan` for Phase 2.2 (TB-native users & customer-hierarchy scoping)
Resume context: `npm install` already run at repo root. `backend/.env` has real ThingsBoard Cloud credentials (gitignored). Redis container `iot-redis` needs `docker start iot-redis` if it's not already running. `backend/dist` and `dist/` are now gitignored (were previously untracked but not ignored).

---
*STATE.md — Updated after every significant action*
*Size target: <100 lines (digest, not archive)*
