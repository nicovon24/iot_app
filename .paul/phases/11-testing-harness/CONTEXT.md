# Phase Context

**Phase:** 11 — Testing harness (backend + frontend, whole app)
**Generated:** 2026-08-05
**Status:** Ready for planning — **scheduling intentionally left open, see Recommendation below**

## Goals

- A real, repeatable automated test suite covering **the whole app**, not just the backend — this supersedes the narrower "Jest for `ThingsboardClientService`" deferred item from Phase 1-2.1 (STATE.md Deferred Issues), which only covered backend.
- Close the gap left by the explicit V1 decision to defer testing entirely and rely on manual runtime verification against real ThingsBoard Cloud — that was the right call to move fast through V1/early V2, but the app now has enough surface area (auth, guards, hierarchy scoping, users/roles, impersonation, admin panel, and soon dashboards) that manual click-through verification alone is starting to be the risky path, not the safe one.
- No architecture rewrite to "become testable" — the existing single-chokepoint pattern (`ThingsboardClientService.request()` on the backend, `api-client.ts`/`ws-client.ts` on the frontend) is exactly what makes this mockable without restructuring anything.
- Scope is genuinely full-stack: backend (NestJS services/guards/controllers) AND frontend (hooks/components/critical flows) — not backend-only like the original deferred item implied.

## Approach

- **Backend — Jest** (already the NestJS-default, zero new tooling decision needed):
  - Unit tests for services (`EntitiesService`, `CustomersService`, `UsersService`, `DashboardsService` once it exists) with `ThingsboardClientService` mocked at its one chokepoint — no real TB calls in unit tests.
  - Guard tests in isolation: `SessionAuthGuard`, `CustomerScopeGuard`, `ReaderBlockGuard`, `RolesGuard` — these are exactly the kind of security-critical logic that benefits most from tests (Phase 2.2's guard-ordering bug was found live, in production-like testing, not by a test suite; a guard unit test would have caught it earlier).
  - A handful of integration tests against a real local ThingsBoard + test Postgres (already exist via Docker) for the highest-value end-to-end paths (login, customer-scoped list, dashboard save/load) — not a full integration suite, just enough to catch drift between the mock and TB's real contract.
- **Frontend — Vitest + React Testing Library** (fits the existing Vite-less Next.js + TanStack Query stack better than Jest's jsdom setup for this codebase):
  - Hook tests (`useEntities`, `usePermissions`, future `useDashboards`) with `api-client`/`ws-client` mocked.
  - Component tests for the widgets that carry real logic (role-gated buttons, `EditEntityDialog`, the future dashboard Add-widget/bulk-add panels) — not snapshot tests of every presentational component.
  - A small Playwright (or similar) e2e smoke suite for the handful of flows that would be genuinely bad to regress silently: login, Client creation wizard, Admin assign/unassign, READER write-block. Kept deliberately small — this is a smoke net, not full e2e coverage.
- **CI wiring** is out of scope for this phase's core goal (no CI system chosen yet for this repo) — tests run locally via `npm test` first; wiring them into a CI pipeline is a natural but separate follow-up, not blocking.
- **No retrofitting 100% coverage of existing code.** Prioritize: (1) guards/auth (highest risk, proven history of real bugs), (2) the shared chokepoints (`ThingsboardClientService`, `api-client.ts`), (3) whatever Phase 10 (dashboards) ships, since it's the newest and least manually-verified surface at that point, (4) everything else, opportunistically.

## Constraints

- Solo-dev project (PROJECT.md Business Constraints) — this must stay a pragmatic test suite sized for one person to maintain, not an enterprise test pyramid. No mandate for a specific coverage percentage.
- No DDD-style rewrite of the backend to "make it more testable" — confirmed in this session's discussion: the existing modular NestJS structure with `ThingsboardClientService` as the sole TB chokepoint is already testable at the right seam without restructuring.
- Real ThingsBoard Cloud has a low quota (see STATE.md Blockers/Concerns — customer/asset limits have been hit before) — integration tests that create real TB entities must clean up after themselves or run against local ThingsBoard Docker, not Cloud, to avoid burning quota on every test run.

## Open Questions

- Exact backend/frontend test split of effort (rough guess: guards + core services first, since that's where the two real historical bugs — guard ordering, activation-link plain-text response — were found) — refine at `/paul:plan`.
- Whether Playwright (or another e2e tool) is worth adding now vs. deferring e2e entirely to a later pass — decide at planning time.
- Whether this phase runs before or after Phase 10 (dashboard builder) — **deliberately not decided here, see Recommendation.**

## Recommendation (scheduling — not a decision, just Claude's input)

Two reasonable orders, both defensible for a solo project:

1. **Testing after Phase 10 ships** (leaning this way): Phase 10 is already fully discussed and scoped, has momentum, and adds a real chunk of new surface (dashboards module, widget registry, bulk-add). Testing once, after Phase 10 lands, covers that new surface in the same pass instead of writing tests now and then writing more tests for Phase 10 right after — less total effort, and the test suite's first version already reflects the app's real V2 shape.
2. **Testing before Phase 10**: catches any latent regression in the existing guard/auth/hierarchy logic before adding more complexity on top, and gives Phase 10 a test harness to extend as it's built rather than bolting tests on afterward. Costs a delay on the "muy importante" dashboard feature the user has been most eager to see.

**My lean: do Phase 10 first, then Phase 11.** The dashboard builder is the feature the user has clearly prioritized across this whole session, the existing guard/auth logic has already been manually verified live multiple times (not zero confidence), and testing both V2's existing surface and Phase 10's new surface together is strictly less work than two separate passes. Final call is the user's — this phase's CONTEXT.md and scope stand regardless of when it's picked up.

## Additional Context

- Supersedes/broadens the narrower "Jest test harness for `ThingsboardClientService`/cache-hit/auth-guard behavior" deferred item from Phase 1-2.1 (backend-only) — this phase is explicitly full-stack per the user's 2026-08-05 request.
- Raised in the same conversation as Phase 10 (dashboard builder) discussion, after a side conversation about whether a DDD approach would have been better suited from the start (concluded: no, not for this project's scope — see Approach/Constraints).

---

*This file is temporary. It informs planning but is not required.*
*Created by /paul:discuss, consumed by /paul:plan.*
