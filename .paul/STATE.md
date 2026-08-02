---
description: "iot_app — current position and accumulated context"
type: ProjectState
about: "iot-app"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-07-30)

**Core value:** Industrial operators can view live and historical telemetry/attributes/alarms for any entity, on a frontend far more flexible than ThingsBoard's native UI, without ThingsBoard credentials ever reaching the browser.
**Current focus:** Phase 4.3 [INSERTED] — Asset hierarchy linking. All 3 plans (4.3-01, 4.3-02, 4.3-03) applied, verified live, and unified. Phase 4.3 CLOSED.

## Current Position

Milestone: Version 1 (v1.0)
Phase: 4.3 of 7 (+ decimals) — COMPLETE. Phases 1-4.3 (+2.1/2.2/2.3) all complete — backend V1 done.
Status: 4.3-01 (parentCustomerId) DONE, verified live. 4.3-02 (remove POST /devices) DONE, verified live. 4.3-03 (Asset hierarchy linking) DONE, verified live against real ThingsBoard Cloud + real Postgres — AC-1 through AC-5 all pass. All 3 SUMMARY.md files written; `/paul:unify` run for the phase.

### 4.3-03 — bug found and fixed during verification
`EntitiesService.assignAssetToCustomer` was calling the CE-only `POST /api/customer/{customerId}/asset/{assetId}` endpoint, which 404s ("No static resource") on this ThingsBoard Cloud Professional Edition instance. Fixed to `POST /api/owner/CUSTOMER/{customerId}/ASSET/{assetId}` (the PE owner-reassignment API — same family already used for `parentCustomerId`, see existing Decisions entry). The failed first attempt (before the fix) correctly triggered the compensating `deleteAsset()` rollback, incidentally providing a real AC-5 verification. Re-ran the full sequence after the fix: all 5 ACs pass. See `.paul/phases/4.3-asset-hierarchy-linking/4.3-03-SUMMARY.md` for full detail.

Last activity: 2026-08-02 — Recreated `iot-redis` and `iot-postgres` Docker containers (both had stopped/been removed since last session), applied pending Prisma migrations to the fresh Postgres, killed stray node processes and restarted the dev server clean, then ran the deferred live verification for 4.3-03 (found+fixed the PE endpoint bug above), wrote all 3 phase SUMMARY.md files, and closed the phase via `/paul:unify`.

Progress:
- Milestone: [█████████░] 85%
- Phase 2.2: [██████████] 100% (2.2-01/2.2-02/2.2-03 all applied, runtime-verified, and unified)
- Phase 2.3: [██████████] 100% (2.3-01 applied, unified, phase transitioned)
- Phase 3: [██████████] 100% (03-01, 03-02 applied, unified, phase transitioned)
- Phase 4: [██████████] 100% (04-01, 04-02 applied, unified, phase transitioned)
- Phase 4.3: [██████████] 100% (4.3-01, 4.3-02, 4.3-03 all applied, verified live, and unified)

## Loop Position

Current loop state (Phase 4.3 — CLOSED):
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 4.3 complete — ready for ROADMAP transition / Phase 5]
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
| Postgres/Prisma scoped to hierarchy-level metadata only in V1 (no local Customer/Client table) | Pre-planning | Phase 4 only touches `CustomerHierarchyLevels`, keyed by real TB `customerId` |
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
| Local Postgres runs on host port 15432, not 5432 | Phase 4 (04-01) | Three native Windows PostgreSQL services were already bound to 5432/5433/5434 on the dev machine, silently intercepting Docker's forwarded connections — any future local Postgres work here must check `netstat` first |
| Prisma pinned to v6, not the current v7 | Phase 4 (04-01) | Prisma 7 requires driver adapters/`prisma.config.ts` instead of a plain `url` in the datasource block — do not `npm update` prisma packages without a deliberate v7 migration decision |
| **"Client" merged into Customer**: no standalone `Client` entity anywhere — `POST /customers` (sysadmin-only) creates a real TB Customer, then its hierarchy levels in Postgres keyed by that real `customerId`; `GET /customers/:id/hierarchy` reads them back. The original `clients/` module and `Client`/`ClientHierarchyLevels` models (built earlier same session) were deleted, and the local dev Postgres was reset to apply the new schema | Phase 4 (revised 2026-08-01) | User explicitly clarified Client and Customer are the same concept; removes redundant modeling. `backend/src/clients/` no longer exists — do not reference it. `CustomerHierarchyLevels` replaces `ClientHierarchyLevels` |
| `CustomersService.create()` creates the TB Customer first, then Postgres hierarchy rows; if the Postgres write fails, the TB Customer is deleted as a compensating action (not a real cross-store transaction — TB and Postgres can't share one) | Phase 4 (04-02 revision) | Avoids an orphaned Customer with no hierarchy if Postgres is unreachable mid-request |
| Hierarchy level names are free-text per Customer (e.g. "Site"/"Area"/"Asset"/"Sensor"), not a fixed enum — Phase 7's wizard will suggest this 4-level default but the backend enforces nothing beyond non-empty/ordered | Phase 4 (user decision) | Keeps `CustomerHierarchyLevels` a generic ordered-label template; a real nested Customer→Asset→Device entity tree (actual TB entity linking) stays deferred to V2 (see Deferred Issues) |
| `POST /customers` accepts an optional `parentCustomerId` to create nested sub-customers in one request | Phase 4.3 (4.3-01) | Closes the write-side gap left by Phase 2.2's read-only `parentCustomerId` walk |
| `POST /devices` removed entirely — Devices are read-only via this API | Phase 4.3 (4.3-02, user decision) | Device-to-Asset linking is a deferred V2 design, not extended ad hoc alongside Asset linking |
| `AssetHierarchyAssignment` Prisma model (customerId, assetId unique, levelIndex) tracks Asset hierarchy position; `POST /assets` requires `customerId`/`levelIndex`/`parentId`, validated against it, and creates a real TB "Contains" relation via a new `EntitiesService.createRelation` | Phase 4.3 (4.3-03) | First real use of ThingsBoard's Relations API in this codebase; same TB-then-Postgres compensating-rollback pattern as `CustomersService.create` |
| `EntitiesService.assignAssetToCustomer` uses `/api/owner/CUSTOMER/{customerId}/ASSET/{assetId}`, not `/api/customer/{customerId}/asset/{assetId}` | Phase 4.3 (4.3-03, bug fix) | The CE-only endpoint 404s ("No static resource") on this ThingsBoard Cloud Professional Edition instance — found live during 4.3-03 verification. Any future TB entity-reassignment call on this instance must use the `/api/owner/{ownerType}/{ownerId}/{entityType}/{entityId}` pattern |

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
| Real nested Customer→Asset→Device entity tree (actual TB Device/Asset linking into the hierarchy, recursive Asset nesting) | Phase 4 (user discussion) | M | Version 2 — Phase 4 only built the ordered-label hierarchy template, not real entity linking; already tracked as "Device/Asset-to-Client/Asset linking wizard" above |
| AC-3-equivalent (non-sysadmin → 403 on `POST /customers`) not re-verified live | Phase 4 | S | Same broken test account (`operator@customer-a.com`, 401 on TB login) as Phase 3's deferred item — fix both together next session |
| No `DELETE /customers/:id` exposed on the REST API (an internal `EntitiesService.deleteCustomer()` exists for the create-rollback path, but isn't routed) | Phase 4 (04-02 revision) | S | Add if a V2 flow needs it; the ThingsBoard MCP `deleteCustomer` tool was used directly to free test-account customer quota this session |

### Blockers/Concerns

All three Phase 2.2 blockers from prior sessions are now resolved (see Decisions above): relation-type confirmed as native `parentCustomerId` (PE), list endpoints are customer-scoped, and full runtime verification passed AC-1 through AC-6 against real ThingsBoard Cloud.

- **Entity-scoped requests still use the shared service-account credential, not the caller's own TB JWT** — `CustomerScopeGuard` is the sole enforcement layer for customer-hierarchy scoping; there is no TB-native defense-in-depth yet (`requestWithToken` with the caller's own `tbToken` exists but entity-scoped calls don't use it). Still deferred, not part of 2.2-03's scope.
- **Entity Groups depend on the current TB PE trial (1 month, up to 5 sensors)** — if it lapses or the account moves to a plan without PE, Entity Groups (and possibly `parentCustomerId`/owner API) stop being available; see ROADMAP.md V2 table.
- **Test data left in real ThingsBoard from 2.2-03 verification** (not mocked): customer "Test-Child" now has `parentCustomerId` = "Test"; device `industrial-pump-002` reassigned to "Test-Child"; user `operator@customer-a.com` had its password set to `PaulTest#2026Verify` via TB's real activation flow. Rotate that password or inform the real user before this account is used for anything beyond testing.
- ThingsBoard Cloud credentials confirmed working. Redis running via `docker run -d --name iot-redis -p 6379:6379 redis:7` (container name `iot-redis` — recreate with that command if `docker ps -a` shows it missing, `docker start` alone won't work if the container was removed).
- **TB Cloud trial account has a very low Customer quota** (hit "Maximum allowed customers limit reached!" with just 2 existing customers) — deleted the leftover "Test-Child" test customer via the ThingsBoard MCP `deleteCustomer` tool to free quota for verification. Only "Test" and the newly-created "Acme Corp" (with a real Site/Area/Asset/Sensor hierarchy) remain. Be mindful of this quota in future sessions creating test customers.
- **Local Postgres (`iot-postgres`, port 15432) was reset same-day** to apply the Client→Customer schema revision — any local dev data created before 2026-08-01 19:52 UTC no longer exists (only test rows, nothing real was lost).
- **Both `iot-redis` and `iot-postgres` Docker containers were gone at the start of the 2026-08-02 session** (redis had stopped, postgres had been removed entirely) — recreated fresh and re-applied Prisma migrations; see Session Continuity for the exact recreate commands.
- Test Customer "Acme43" was deleted and recreated with a full Site→Area→Asset→Sensor hierarchy during 4.3-03 verification (quota-constrained — only "Test" and "Acme43" exist). It now owns two real test Assets ("Plant North", "North Wing") linked via real TB Contains relations, tracked in `AssetHierarchyAssignment`.
- **CRITICAL — TB Cloud Professional Edition trial has expired**: confirmed 2026-08-02 via `GET /api/tenant/{tenantId}` showing `addonData.maxAssets: 0` and `addonData.maxCustomers: 0`. All Customers and Assets that existed on the tenant (including "Test", "Acme43", "Plant North", "North Wing") are now gone — wiped by TB itself on the plan downgrade, not by app code. Devices are unaffected (4 still present). **No Customer or Asset can be created or read until the TB plan is renewed/upgraded** — this blocks any further live verification of Phase 4/4.3 functionality and blocks Phase 7 (client wizard) testing. Postgres `CustomerHierarchyLevels`/`AssetHierarchyAssignment` rows for the deleted TB entities are now orphaned (stale local records pointing at TB ids that no longer exist) — clean these up once a fresh trial/plan is active, don't treat them as valid until then.

## Boundaries (Active)

- `backend/src/thingsboard/thingsboard-client.service.ts` — do not bypass; all TB HTTP calls go through `request<T>()`
- `backend/src/thingsboard/thingsboard.types.ts` — raw TB shapes, extend rather than duplicate
- `backend/src/entities/entities.service.ts` — the only place that maps `TbDevice`/`TbAsset`/`TbCustomer` to `EntityRef`; devices/assets/customers controllers must stay thin wrappers over it
- `backend/src/common/guards/session-auth.guard.ts` — global via `APP_GUARD`; new controllers are protected by default, only opt out with `@Public()` on a specific handler, never module-wide
- `backend/src/common/guards/customer-scope.guard.ts` — also global via `APP_GUARD`, registered in `app.module.ts`'s `providers` array **after** `SessionAuthGuard` (order matters, see Decisions) — scopes both `:id`-scoped routes and (via `EntitiesService.list`, not the guard itself) list endpoints
- **Both `SessionAuthGuard` and `CustomerScopeGuard` must stay registered together in `app.module.ts`'s `providers` array, Session first** — do not move either one back into a separate module's `providers`, that reintroduces the guard-ordering bug fixed in 2.2-03
- `backend/src/common/guards/roles.guard.ts` + `backend/src/common/decorators/roles.decorator.ts` — opt-in per-controller via `@UseGuards(RolesGuard)` + `@Roles('SYSADMIN')` (not global); only `'SYSADMIN'` is currently recognized
- **There is no `backend/src/clients/` module and no `Client`/`ClientHierarchyLevels` Prisma models** — both were removed 2026-08-01. The Client-creation wizard lives entirely in `backend/src/customers/` (`CustomersController`/`CustomersService`) plus the `CustomerHierarchyLevels` Prisma model. Do not recreate a separate Client concept — see Decisions above
- `backend/src/entities/entities.service.ts` — also owns `createCustomer()`/`deleteCustomer()` now, alongside `createDevice()`/`createAsset()`; `CustomersService` calls these, doesn't hit `ThingsboardClientService` directly

## Session Continuity

Last session: 2026-08-02
Stopped at: Phase 4.3 fully unified — all 3 plans (parentCustomerId on Customer creation, POST /devices removal, real Asset hierarchy linking with a TB Contains relation) verified live and closed. A real PE-vs-CE endpoint bug was found and fixed in `EntitiesService.assignAssetToCustomer` during verification (see Decisions).
Next action: Run the phase-transition step for Phase 4.3 (evolve PROJECT.md/ROADMAP.md, phase commit) if not already auto-triggered by `/paul:unify`, then move to Phase 5 (Frontend foundation & API/WS clients) with `/paul:plan` for 05-01 (Next.js scaffold + layout + nav). Still-open from before: the AC-3-equivalent non-sysadmin re-verification gap (`operator@customer-a.com` 401s on TB login — needs a working non-sysadmin test account).
Resume context: `npm install` already run at repo root. `backend/.env` has real ThingsBoard Cloud credentials (gitignored) + `DATABASE_URL` on port 15432. Both `iot-redis` and `iot-postgres` Docker containers had to be recreated this session (they were gone/stopped) — recreate with `docker run -d --name iot-redis -p 6379:6379 redis:7-alpine` and `docker run -d --name iot-postgres -p 15432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=iot_app postgres:16-alpine`, then `npx prisma migrate deploy` before starting the server, if either is missing again next session. Prisma pinned to v6. `backend/dist` and `dist/` are gitignored. Dev server (`npm run start:dev`) is running in the background from this session (PID varies — check `Get-NetTCPConnection -LocalPort 3001` before starting another).

---
*STATE.md — Updated after every significant action*
*Size target: <100 lines (digest, not archive)*
