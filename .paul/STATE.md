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
Phase: 2.2 of 7 (+2 inserted phases: 2.1 complete, 2.2 code-complete) (TB-native users & customer-hierarchy scoping)
Plan: 2.2-01 and 2.2-02 (both APPLY done, not yet runtime-verified)
Status: Phase 2.2-01 tasks 0-4 AND the 2.2-02 users module (`RolesGuard`/`@Roles('SYSADMIN')` + `users` CRUD) are implemented and building clean; live-TB verification and the list-endpoint scoping gap are still open (see Blockers/Concerns)
Last activity: 2026-07-31 — Applied Phase 2.2-01 (TB-native login, CustomerScopeGuard, CR-01/CR-02 fixes) and Phase 2.2-02 (users module: RolesGuard, @Roles decorator, sysadmin-only Customer User CRUD) — all in the same session, no separate plan file was written for 2.2-02 before coding it

Progress:
- Milestone: [███░░░░░░░] 36%
- Phase 2.1: [██████████] 100%
- Phase 2.2: [█████████░] ~90% (both plans code complete, not runtime-verified, list-endpoint scoping gap open)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [Phase 2.2-01 applied — pending live-TB verification before UNIFY]
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
| Customer-hierarchy descendants resolved via TB Customer→Customer relations of type "Contains" | Phase 2.2 | TB CE has no native customer-hierarchy field; sub-customer structure must be expressed as relations — **unverified against a real TB instance, see Blockers/Concerns** |
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

### Blockers/Concerns

- **Phase 2.2 code written but NOT runtime-verified against real ThingsBoard** — no TB Tenant Admin + Customer User test accounts with a sub-customer relation were exercised this session (MCP ThingsBoard tools were unavailable/disconnecting during this work). `npx nest build` and `tsc --noEmit` both pass, but none of AC-0 through AC-4 have been confirmed against a live TB instance yet. Do this before considering Phase 2.2 done.
- **Known gap in `CustomerScopeGuard`:** only enforces scoping on `:id`-scoped routes (`GET /devices/:id`, `GET /entities/:id/attributes`, etc.). List endpoints (`GET /devices`, `GET /assets`, `GET /entities?type=...`, `GET /customers`) are NOT filtered by customer — a `CUSTOMER_USER` can currently list entities/customers across the whole tenant, even though it can't read their detail. Needs a follow-up task (filter list results by the caller's customer + descendants, likely via `/api/customer/{id}/devices` etc. instead of `/api/tenant/devices`) before this phase is truly complete.
- **Entity-scoped requests still use the shared service-account credential, not the caller's own TB JWT** — `CustomerScopeGuard` is the sole enforcement layer for customer-hierarchy scoping; there is no TB-native defense-in-depth yet (the plan's Task 2 recommended using `requestWithToken` with the caller's own `tbToken` for entity-scoped calls, which was scoped but not implemented this session).
- **`CustomerScopeGuard`'s hierarchy resolution is an unverified assumption:** it walks `Customer->Customer` relations of type `"Contains"` via TB's relations API to find sub-customers, since ThingsBoard CE has no native customer-hierarchy field. This needs to be confirmed against how the real TB instance actually models parent/child customers (or that relation needs to be created deliberately when sub-customers are set up) — otherwise `isDescendantCustomer` will always return false and sub-customer users will be wrongly scoped to only their exact customer.
- ThingsBoard Cloud credentials confirmed working (service-account login only, verified prior to Phase 2.2). Redis running via `docker run -d --name iot-redis -p 6379:6379 redis:7` (container name `iot-redis` — recreate with that command if `docker ps -a` shows it missing, `docker start` alone won't work if the container was removed).

## Boundaries (Active)

- `backend/src/thingsboard/thingsboard-client.service.ts` — do not bypass; all TB HTTP calls go through `request<T>()`
- `backend/src/thingsboard/thingsboard.types.ts` — raw TB shapes, extend rather than duplicate
- `backend/src/entities/entities.service.ts` — the only place that maps `TbDevice`/`TbAsset`/`TbCustomer` to `EntityRef`; devices/assets/customers controllers must stay thin wrappers over it
- `backend/src/common/guards/session-auth.guard.ts` — global via `APP_GUARD`; new controllers are protected by default, only opt out with `@Public()` on a specific handler, never module-wide
- `backend/src/common/guards/customer-scope.guard.ts` — also global via `APP_GUARD` (second guard, registered after `SessionAuthGuard` in `app.module.ts`); only scopes routes with both an `:id` param and a `type` query (entity-scoped routes) — list endpoints are NOT scoped yet, see Blockers/Concerns
- `backend/src/common/guards/roles.guard.ts` + `backend/src/common/decorators/roles.decorator.ts` — opt-in per-controller via `@UseGuards(RolesGuard)` + `@Roles('SYSADMIN')` (not global); only `'SYSADMIN'` is currently recognized

## Session Continuity

Last session: 2026-07-31
Stopped at: Phase 2.2-01 applied (all 5 tasks from `.paul/phases/2.2-tb-native-permissions/2.2-01-PLAN.md`): `ParseTbIdPipe` on every `:id` (CR-01), `URLSearchParams` fixes (CR-02), real ThingsBoard login (`auth.service.ts` — no more shared-account fallback), `CustomerScopeGuard` (customer-hierarchy scoping via TB relations), and a new sysadmin-only `users` module. `npx nest build` and `tsc --noEmit` both pass. **Not yet runtime-verified against real ThingsBoard** — no TB Tenant Admin/Customer User test accounts were exercised this session. Two real gaps found during self-qualify and logged in Blockers/Concerns: (1) list endpoints aren't customer-scoped, only `:id` routes are, (2) the customer-hierarchy relation type ("Contains") the guard assumes is unverified against how the real TB instance actually models sub-customers.
Next action: runtime-verify Phase 2.2-01 against real ThingsBoard (create a Tenant Admin login + a Customer User with a sub-customer relation, confirm AC-0 through AC-4), then decide how to close the list-endpoint scoping gap before running `/paul:unify`.
Resume context: `npm install` already run at repo root. `backend/.env` has real ThingsBoard Cloud credentials (gitignored). Redis container `iot-redis` recreated 2026-07-31 with `docker run -d --name iot-redis -p 6379:6379 redis:7`; if `docker ps -a --filter name=iot-redis` comes back empty again, recreate with that same command rather than `docker start`. `backend/dist` and `dist/` are gitignored.

---
*STATE.md — Updated after every significant action*
*Size target: <100 lines (digest, not archive)*
