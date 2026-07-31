---
description: "iot_app — current position and accumulated context"
type: ProjectState
about: "iot-app"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-07-30)

**Core value:** Industrial operators can view live and historical telemetry/attributes/alarms for any entity, on a frontend far more flexible than ThingsBoard's native UI, without ThingsBoard credentials ever reaching the browser.
**Current focus:** Version 1, Phase 3 — Live telemetry & alarms (WebSocket gateways) — Plan 03-01 created, awaiting approval

## Current Position

Milestone: Version 1 (v1.0)
Phase: 3 of 7 (Live telemetry & alarms) — Planning
Plan: 03-01 created — see `.paul/phases/03-live-telemetry-alarms/03-01-PLAN.md`
Status: PLAN created (WS gateway for telemetry, using `@nestjs/platform-ws` WsAdapter over Fastify per user decision), ready for APPLY
Last activity: 2026-07-31 — Closed Phase 2.2 loop via /paul:unify, then created Plan 03-01: Telemetry WebSocket gateway (auth/scope reused from REST via extracted shared util, ThingsboardWsService multiplexed upstream subscription with reconnect/backoff, TelemetryGateway client protocol).

Progress:
- Milestone: [█████░░░░░] 40%
- Phase 2.2: [██████████] 100% (2.2-01/2.2-02/2.2-03 all applied, runtime-verified, and unified)
- Phase 3: [░░░░░░░░░░] 0% (Plan 03-01 created, not yet applied)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan 03-01 created, awaiting approval]
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
| Customer-hierarchy descendants resolved via TB's native `parentCustomerId` field (Professional Edition), walked upward from target to caller's customer — **superseded the original "Contains" relation design after 2.2-03 confirmed against real TB that PE has this field natively (`POST /api/owner/CUSTOMER/{ownerId}/{entityType}/{entityId}` sets it)** | Phase 2.2 (2.2-03) | Simpler and matches the real platform; generic "Contains" relations remain in use for asset/device containment (separate feature), not customer hierarchy |
| Both global guards (`SessionAuthGuard`, `CustomerScopeGuard`) now registered together in `app.module.ts`'s own `providers` array, in explicit order (Session first) | Phase 2.2 (2.2-03, bug fix) | Previously registered as `APP_GUARD` in two different modules (`AuthModule`, `AppModule`); Nest does not guarantee execution order across modules for same-token providers, and in practice `CustomerScopeGuard` ran *before* `SessionAuthGuard`, so `request.session` was always undefined at check time — every `:id`-scoped request silently bypassed hierarchy scoping since Phase 2.2 shipped. Found via runtime debug logging (console.log was silently swallowed by the background-process output capture; `fs.appendFileSync` to a plain file was needed to see real values) during 2.2-03 verification, not caught by any prior code review |
| `isDescendantCustomer` treats a 404 while walking `parentCustomerId` as "not a descendant" (→ 403), not a server error | Phase 2.2 (2.2-03) | TB's `NULL_UUID` placeholder (`13814000-1dd2-11b2-8080-808080808080`) appears as `customerId` on entities never assigned to a real customer; looking it up 404s, which previously leaked as a raw 500/404 to the caller instead of a clean 403 |
| `admin`/`reader` role distinction stored in TB user `additionalInfo.appRole`, not a separate table | Phase 2.2 | Keeps the ADMIN/READER split TB-native per the user's explicit instruction, no parallel persistence |
| Entity-scoped calls (entities/attributes/telemetry) still go through the shared service-account credential (`ThingsboardClientService.request()`); `CustomerScopeGuard` is the only enforcement layer, not TB itself | Phase 2.2 | `loginWithCredentials`/`getUserProfile`/`requestWithToken` were added to resolve the caller's own TB identity at login, but wiring entity-scoped requests to use the caller's own `tbToken` (defense-in-depth via TB's native isolation) was NOT done this session — deferred, see Blockers/Concerns |
| `CustomerScopeGuard` is registered as a **second** global `APP_GUARD` alongside `SessionAuthGuard` (`app.module.ts`); it no-ops (`return true`) when `request.session` is unset, deferring entirely to `SessionAuthGuard`/`@Public()` | Phase 2.2 | Two global guards now run on every request in sequence — new controllers get both auth and hierarchy-scoping by default, no per-controller wiring needed |
| `users` module (create/list/delete Customer Users) is sysadmin-only via a new `RolesGuard` + `@Roles('SYSADMIN')` decorator, checked against `session.authority` (`TENANT_ADMIN`/`SYS_ADMIN`) | Phase 2.2 (2.2-02) | `RolesGuard` currently only recognizes the `'SYSADMIN'` role string — not a general RBAC system, just enough to gate the users module; extend deliberately if more roles need route-level gating later |
| User creation activates the TB Customer User via the real activation-link flow (`GET /api/user/:id/activationLink` → parse `activateToken` → `POST /api/noauth/activate`) instead of emailing an activation link (`sendActivationMail=false`) | Phase 2.2 (2.2-02) | Lets `admin`/`reader` accounts get a usable password synchronously at creation time, no email step required for this PoC |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Device/Asset-to-Client/Asset linking wizard | Roadmap scoping | M | Version 2 |
| Área/asset-level permission granularity (finer than customer hierarchy) | Roadmap scoping / Phase 2.2 clarification | M | Version 2 — no design chosen, TB CE has no Entity Groups to back it |
| User-editable dashboards (react-grid-layout) | Roadmap scoping | L | Version 2 |
| No Jest test harness yet for `ThingsboardClientService`/cache-hit/auth-guard behavior | Phase 1-2.1 | S | When Jest is wired in a later plan (manual runtime verification already done against real TB+Redis for all of Phases 1, 2, 2.1) |
| No DELETE endpoints for devices/assets/customers | Phase 2.1 | S | Add if V2 wizards need entity deletion |
| Phase 6 telemetry widget needs an interval picker to use the new `agg`/`interval` params | Phase 2.1 | S | When Phase 6 (frontend entity views) is planned |
| Implement real TB token refresh (`ThingsboardClientService.refreshToken()` via `POST /api/auth/token` + retry-on-401 in `AuthService` using the already-stored `tbRefreshToken`) before wiring `requestWithToken` to per-user entity-scoped calls | Phase 2.2 (auth discussion) | S | When the frontend (Phase 5+) starts consuming the session end-to-end — TB's user JWT expires well before the 8h app-session TTL, so this must land before per-user `tbToken` calls are wired in, or sessions will silently 401 mid-session |

### Blockers/Concerns

All three Phase 2.2 blockers from prior sessions are now resolved (see Decisions above): relation-type confirmed as native `parentCustomerId` (PE), list endpoints are customer-scoped, and full runtime verification passed AC-1 through AC-6 against real ThingsBoard Cloud.

- **Entity-scoped requests still use the shared service-account credential, not the caller's own TB JWT** — `CustomerScopeGuard` is the sole enforcement layer for customer-hierarchy scoping; there is no TB-native defense-in-depth yet (`requestWithToken` with the caller's own `tbToken` exists but entity-scoped calls don't use it). Still deferred, not part of 2.2-03's scope.
- **Entity Groups depend on the current TB PE trial (1 month, up to 5 sensors)** — if it lapses or the account moves to a plan without PE, Entity Groups (and possibly `parentCustomerId`/owner API) stop being available; see ROADMAP.md V2 table.
- **Test data left in real ThingsBoard from 2.2-03 verification** (not mocked): customer "Test-Child" now has `parentCustomerId` = "Test"; device `industrial-pump-002` reassigned to "Test-Child"; user `operator@customer-a.com` had its password set to `PaulTest#2026Verify` via TB's real activation flow. Rotate that password or inform the real user before this account is used for anything beyond testing.
- ThingsBoard Cloud credentials confirmed working. Redis running via `docker run -d --name iot-redis -p 6379:6379 redis:7` (container name `iot-redis` — recreate with that command if `docker ps -a` shows it missing, `docker start` alone won't work if the container was removed).

## Boundaries (Active)

- `backend/src/thingsboard/thingsboard-client.service.ts` — do not bypass; all TB HTTP calls go through `request<T>()`
- `backend/src/thingsboard/thingsboard.types.ts` — raw TB shapes, extend rather than duplicate
- `backend/src/entities/entities.service.ts` — the only place that maps `TbDevice`/`TbAsset`/`TbCustomer` to `EntityRef`; devices/assets/customers controllers must stay thin wrappers over it
- `backend/src/common/guards/session-auth.guard.ts` — global via `APP_GUARD`; new controllers are protected by default, only opt out with `@Public()` on a specific handler, never module-wide
- `backend/src/common/guards/customer-scope.guard.ts` — also global via `APP_GUARD`, registered in `app.module.ts`'s `providers` array **after** `SessionAuthGuard` (order matters, see Decisions) — scopes both `:id`-scoped routes and (via `EntitiesService.list`, not the guard itself) list endpoints
- **Both `SessionAuthGuard` and `CustomerScopeGuard` must stay registered together in `app.module.ts`'s `providers` array, Session first** — do not move either one back into a separate module's `providers`, that reintroduces the guard-ordering bug fixed in 2.2-03
- `backend/src/common/guards/roles.guard.ts` + `backend/src/common/decorators/roles.decorator.ts` — opt-in per-controller via `@UseGuards(RolesGuard)` + `@Roles('SYSADMIN')` (not global); only `'SYSADMIN'` is currently recognized

## Session Continuity

Last session: 2026-07-31
Stopped at: Phase 2.2 loop closed via /paul:unify. 2.2-03-SUMMARY.md already documented AC results/deviations; ROADMAP.md already showed Phase 2.2 Complete. This unify pass reconciled STATE.md's loop position/current-focus to match and confirmed nothing else was pending.
Next action: start Phase 3 (Live telemetry & alarms — WebSocket gateways) with `/paul:plan` for 03-01 (Telemetry WebSocket gateway).
Resume context: `npm install` already run at repo root. `backend/.env` has real ThingsBoard Cloud credentials (gitignored). Redis container `iot-redis` recreated 2026-07-31 with `docker run -d --name iot-redis -p 6379:6379 redis:7`; if `docker ps -a --filter name=iot-redis` comes back empty again, recreate with that same command rather than `docker start`. `backend/dist` and `dist/` are gitignored. No dev server left running at end of session (stopped after verification).

---
*STATE.md — Updated after every significant action*
*Size target: <100 lines (digest, not archive)*
