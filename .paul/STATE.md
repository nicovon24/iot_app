---
description: "iot_app — current position and accumulated context"
type: ProjectState
about: "iot-app"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-07-30)

**Core value:** Industrial operators can view live and historical telemetry/attributes/alarms for any entity, on a frontend far more flexible than ThingsBoard's native UI, without ThingsBoard credentials ever reaching the browser.
**Current focus:** Version 1, Phase 1 — Backend foundation & ThingsBoard auth

## Current Position

Milestone: Version 1 (v1.0)
Phase: 1 of 7 (Backend foundation & ThingsBoard auth)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-07-30 — ROADMAP.md generated for all 7 V1 phases via /paul:plan prep

Progress:
- Milestone: [░░░░░░░░░░] 0%
- Phase: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ◉        ○        ○     [Planning]
```

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total Time | Avg/Plan |
|-------|-------|------------|----------|
| 01-backend-foundation | 0/3 | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Redis included from V1, not deferred | Pre-planning | JWT + telemetry/attribute cache is part of Phase 1/2 scope, not a later add-on |
| Postgres/Prisma scoped to hierarchy + Client only in V1 | Pre-planning | Phase 4 only touches `hierarchy_level_definitions`, no other tables |
| Client-creation wizard is the only V1 wizard, hierarchy immutable after creation | Pre-planning | Phase 4/7 scope is intentionally narrow — no hierarchy-edit endpoint/UI |
| Frontend is Next.js App Router | Pre-planning | Phases 5-7 scaffolded as Next.js, not Vite+React |
| Swagger is the only API testing tool for REST (no Bruno/Postman) | Pre-planning | Every REST endpoint plan in Phases 1-4 now includes "+ Swagger docs" as an explicit deliverable, documented as it's built |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Asset/Device creation + linking wizards | Roadmap scoping | M | Version 2 |
| Roles/granular permissions | Roadmap scoping | M | Version 2 |
| User-editable dashboards (react-grid-layout) | Roadmap scoping | L | Version 2 |

### Blockers/Concerns

| Blocker | Impact | Resolution Path |
|---------|--------|------------------|
| No ThingsBoard instance credentials confirmed yet (cloud vs local Docker) | Phase 1 can't be applied/tested end-to-end | Confirm `THINGSBOARD_URL` + credentials before running `/paul:apply` on Phase 1 |

## Boundaries (Active)

- None yet — no PLAN.md approved for Phase 1

## Session Continuity

Last session: 2026-07-30
Stopped at: ROADMAP.md and PROJECT.md populated for Version 1 (7 phases); no PLAN.md written yet
Next action: Run `/paul:plan` to produce PLAN.md for Phase 1 (Backend foundation & ThingsBoard auth)
Resume context: Backend/frontend folder scaffolding already exists (`backend/src/*`, `frontend/src/*`); `package.json`/`tsconfig.json`/`nest-cli.json`/`.env.example` already written for backend — Phase 1 plan should build on top of these, not recreate them.

---
*STATE.md — Updated after every significant action*
*Size target: <100 lines (digest, not archive)*
