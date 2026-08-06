---
phase: 10-dashboard-builder
plan: 02
type: Summary
about: "iot-app"
---

# 10-02 Summary — Frontend dashboard builder base

**Status:** Applied. `npx tsc --noEmit` clean, `npm run build` succeeds (`/dashboard/[id]` registered as a dynamic route). Verified via `next build` + a running dev server (backend session-guard 401 confirmed unchanged, frontend route compiles and serves the new page module + `react-grid-layout` chunk). Not click-tested in a real browser this session (no browser tool in this environment) — needs a live session token to exercise AC-1/AC-2/AC-4 end to end.

## What was built

- **`react-grid-layout@1.5.4`** added (+ `@types/react-grid-layout@1.3.5`, since the current `2.x` types package is a stub with no actual declarations — pinned to the older version deliberately, see Decisions below). Classic API (`isDraggable`/`isResizable`/`layout`/`onLayoutChange`), not the v2 rewrite.
- **`frontend/src/lib/api-client.ts`**: added `put()` to the shared `apiClient` chokepoint.
- **`frontend/src/types/dashboard.ts`** + `hooks/useDashboards.ts`: types mirroring the backend, plus `useDashboards`/`useDashboard`/`useCreateDashboard`/`useSaveDashboard`/`useDeleteDashboard`, following the exact `useCustomers.ts` mutation pattern.
- **`frontend/src/dashboards/widget-registry.tsx`**: UI-metadata registry (label, `needsEntity`, `needsTelemetryKey`, default grid size) — mirrors the backend's `WIDGET_TYPES`, doesn't duplicate its Zod validation.
- **`frontend/src/dashboards/DashboardWidgetRenderer.tsx`**: dispatches by `widgetType` to 5 small cells, each fetching its own data via existing hooks (`useTelemetryLatest`/`useTelemetryHistory`/`useEntityAttributes`/`useEntityAlarms`/`useGlobalAlarms`) and rendering the existing Phase 6/6.4 widget components unmodified. A shared `useEntityOrUnavailable` resolves the entity first and renders `<WidgetUnavailable />` on a 404 instead of letting the fetch error propagate.
- **`frontend/src/dashboards/DashboardCanvas.tsx`**: `react-grid-layout` wrapper (via `WidthProvider`), view mode (no drag/resize) vs edit mode (drag/resize + a remove-× overlay per widget).
- **`frontend/src/dashboards/AddWidgetPanel.tsx`**: one-by-one add flow — widget type → (entity type → entity → telemetry key, only the fields the chosen type needs) → Add, staged client-side only, "Add" disabled until required fields are filled.
- **`frontend/src/app/dashboard/[id]/page.tsx`**: loads a dashboard (or starts blank+edit-mode for `id === 'new'`), stages all widget/layout changes locally, one "Save" button calls `create`/`save` with the full widget list. Handles 404/403 from `useDashboard` with a clear inline message instead of a blank page.
- **`frontend/src/components/layout/Sidebar.tsx`**: `DASHBOARD_OPTIONS` is now computed from `useDashboards()` (Main Dashboard + every visible custom dashboard + "+ New dashboard"), replacing the hardcoded single-item array from Phase 6.5's seam.

## Key decisions made while implementing (not already in CONTEXT.md/10-02-PLAN.md)

- **Pinned `react-grid-layout@1.5.4`, not the latest `2.x`.** v2 is a from-scratch rewrite (hook-based API, `dragConfig`/`resizeConfig` objects, requires an explicit numeric `width` even on its "responsive" export) with materially higher implementation risk for this session's no-browser verification constraints. v1's classic `isDraggable`/`layout`/`onLayoutChange` API is the one virtually every tutorial and this plan's design assumed. Revisit v2 later if there's a concrete reason (e.g. dropping the `react-resizable` transitive dependency).
- **`@types/react-grid-layout` needed pinning to `1.3.5`**, not the current npm-listed `2.1.0` — that version is an empty deprecated stub (no `.d.ts` at all) written for v2's self-shipped types, useless against the v1 package actually installed.
- **`DashboardWidget.dashboardId` made optional** in the frontend type (`types/dashboard.ts`) — staged/new widgets don't have a real `dashboardId` yet before the first save, and `DashboardWidgetRenderer`/`DashboardCanvas` never read that field anyway.
- **One-by-one panel's `alarms-list`/`map` types don't offer an entity picker** (`needsEntity: false` in the registry) — kept simple for this plan (global alarms / fleet map only from this flow); a per-entity alarms/map widget is still reachable by hand-editing `config` later or via a future bulk-add path, not blocking here.
- Ran into (and fixed) an accidental nested `frontend/node_modules` from a `cd frontend`-scoped `npm install -w frontend` call mid-session — cleaned up and reinstalled from the actual repo root with `--ignore-scripts` (the backend's `postinstall: prisma generate` was hitting the known EPERM file-lock issue from a leftover `nest start:dev` process; killed it first). No effect on committed files, purely a local `node_modules` correction.

## Verification

- `npx tsc --noEmit` — clean in `frontend/`.
- `npm run build` — succeeds, `/dashboard/[id]` listed as a dynamic (`ƒ`) route.
- Dev server smoke test: `GET /dashboard/new` and `GET /dashboard` both return 200 HTML with the new page's RSC module and the `react-grid-layout` chunk referenced — confirms the route compiles and serves, not a build-only false positive.
- Backend's `SessionAuthGuard` still returns 401 on `GET /dashboards` with no token, confirming 10-01's guard behavior is untouched by this frontend-only plan.

## Deferred / not done

- **No real click-through verification** (create a dashboard, add a widget via the panel, save, reload, confirm persistence) — needs a browser and a live session token, neither available in this environment this session. Flagged as the highest-priority manual check before trusting AC-1/AC-2/AC-4 as done.
- Dashboard-level settings editor (title/visibility/customerScope/customerIds UI) beyond the bare minimum `/dashboard/new` needs — out of scope per the plan's boundaries.
- Bulk-add — Plan 10-03, not started yet.
