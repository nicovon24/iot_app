# Testing Rules

> Status: no test suite is implemented yet (`npm test` in `backend/package.json` runs Jest but no spec files exist). This file documents the intended strategy for when testing work starts — it is not a signal to scaffold Jest now. Per project decision, testing setup is deferred until backend V1 (ROADMAP.md phases 1-4) is complete.

## Strategy when testing starts

- **Never hit real ThingsBoard or Redis in unit/integration tests.** `ThingsboardClientService` and `RedisService` must be mocked/stubbed — TB Cloud has no test-tenant isolation guarantee, and tests must not depend on network availability or mutate real TB data.
- **Guard logic (`CustomerScopeGuard`, `RolesGuard`, `SessionAuthGuard`) is the highest-value test target** — customer-hierarchy scoping is security-relevant and easy to get wrong (see `.paul/rules/api.md` scoping rules). Test descendant-resolution edge cases (cycles, missing customerId, TENANT_ADMIN bypass) with a stubbed relations graph, not real TB relations.
- **Device emulation**: since V1 has no physical hardware, "device" in tests means a fixture (`EntityRef`/telemetry payload shape), not a live emulator process. Keep fixtures matching TB's real response shapes (e.g. `valueAsString`, not `number` — see api.md telemetry contract) so mocks don't drift from the real contract.
- **Serialization contract tests**: any test touching telemetry endpoints must assert the response value is a `string`, never a JS `number` — this is a correctness rule (float precision), not just a style preference.
- **E2E**: session-token flow (`POST /auth/login` → `x-session-token` header → protected route) is the one flow worth an end-to-end test before others, since every other endpoint depends on `SessionAuthGuard` passing.

## What NOT to do

- Don't write tests against ThingsBoard Cloud directly — no dedicated test tenant exists yet; decide on one before any integration test suite is built.
- Don't add test infrastructure (Jest config changes, CI test job, coverage thresholds) speculatively — wait until the user confirms backend V1 is functionally done.
