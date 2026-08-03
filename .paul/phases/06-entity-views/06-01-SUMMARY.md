---
phase: 06-entity-views
plan: 01
subsystem: ui
tags: [nextjs, tanstack-query, heroui, tailwind, framer-motion, dark-mode, sidebar]

requires:
  - phase: 05-frontend-foundation
    provides: apiClient/queryClient, EntityRef/PageData types, AppLayout shell, Sidebar/AuthGate, login flow
provides:
  - Real Devices/Assets list pages backed by live ThingsBoard data
  - EntityListWidget — reusable themed table pattern for future entity lists (Phase 7 Clients list, etc.)
  - App-wide dark/light mode (CSS-var token toggle, no per-component dark: classes needed)
  - Sidebar v2 — collapsible labels, header-matching gradient, animated active indicator, custom Tooltip
  - Semantic text-color token system (heading/body/muted/faint/danger) replacing hardcoded Tailwind grays
affects: [06-02, 06-03, 07-client-wizard-ui]

tech-stack:
  added: []
  patterns:
    - "framer-motion actually wired into production UI for the first time (layout animation, AnimatePresence tooltip, active-tab pill via layoutId)"
    - "Dark mode implemented as CSS custom-property overrides under :root.dark, not Tailwind dark: utility sprinkling — mirrors the existing white-label token mechanism from Phase 5"
    - "Custom Tooltip.tsx replaces HeroUI's Tooltip app-wide — HeroUI's Tooltip proved unstyled in this HeroUI v2.8/Tailwind v4 combo"

key-files:
  created:
    - frontend/src/hooks/useEntities.ts
    - frontend/src/widgets/EntityListWidget.tsx
    - frontend/src/components/Tooltip.tsx
    - frontend/src/hooks/useTheme.ts
  modified:
    - frontend/src/app/devices/page.tsx
    - frontend/src/app/assets/page.tsx
    - frontend/src/components/Sidebar.tsx
    - frontend/src/app/layout.tsx
    - frontend/src/app/globals.css
    - frontend/tailwind.config.ts
    - frontend/src/app/login/page.tsx
    - frontend/src/app/not-found.tsx
    - frontend/src/components/ComingSoon.tsx

key-decisions:
  - "HeroUI's Tooltip component is unusable in this stack — replaced app-wide with a custom Tailwind + framer-motion Tooltip"
  - "Sidebar background now shares the header's gradient tokens instead of a fixed navy — sidebar/header stay constant across light/dark mode by design"
  - "Dark mode toggles a `dark` class on <html>, backed by CSS custom-property overrides in globals.css, not scattered dark: utility classes"
  - "All text colors migrated from literal Tailwind grays (text-slate-900 etc.) to semantic tokens (heading/body/muted/faint/danger) so dark mode lightens text, not just backgrounds"

patterns-established:
  - "Any new UI text color must use a text-{heading|body|muted|faint|danger} token, never text-slate-*/text-red-* literals, or it silently breaks in dark mode"
  - "Any new tooltip need reuses components/Tooltip.tsx, not @heroui/react's Tooltip"

duration: ~90min (across one interactive session with live styling/UX feedback)
started: 2026-08-02T00:00:00Z
completed: 2026-08-02T00:00:00Z
description: "Real Devices/Assets list pages, plus a full sidebar/dark-mode redesign done live in response to user feedback mid-verification"
type: Summary
about: "iot-app"
---

# Phase 6 Plan 01: Devices/Assets list pages Summary

**Devices/Assets now show real ThingsBoard data end-to-end, and — driven by live user feedback during verification — the app shell got a real dark/light mode, a redesigned collapsible sidebar, and a working custom Tooltip replacing a broken HeroUI one.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~90min |
| Tasks | 3 of 3 planned, plus 5 unplanned follow-up rounds (table restyle, tooltip fix, sidebar redesign, dark/light mode, text-token migration) |
| Files modified | 13 (4 planned + 9 from deviations) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Devices page shows real live data | Pass | Verified directly against the real backend via curl with a real session token: `GET /devices` returned the 4 real Devices (`industrial-pump-003/004/005/006`) in `PageData<EntityRef>` shape |
| AC-2: Assets page loads without erroring, zero results | Pass | `GET /assets` verified returning `{"data":[],"totalPages":0,"totalElements":0,"hasNext":false}` — matches the TB Cloud PE trial's `maxAssets:0` state from STATE.md Blockers |
| AC-3: Table columns show real entity fields | Pass | Name/Type/Customer columns render real `EntityRef` fields; verified via curl payload inspection and `tsc --noEmit` |
| AC-4: Loading and error states handled | Pass (partially observed) | `Spinner`/error-message/empty-state branches are implemented and type-checked; the loading/error branches specifically weren't exercised live (no 401 was deliberately triggered this session) — low risk given `ApiError` is already typed and used elsewhere, but not empirically confirmed |

## Accomplishments

- Real Devices/Assets pages replacing the Phase 5 `ComingSoon` placeholders, proving the full stack (auth → apiClient → TanStack Query → UI) end-to-end for the first time with real ThingsBoard-backed data
- Found and fixed a real bug: HeroUI's `Tooltip` rendered completely unstyled (no box, no positioning) in this project's HeroUI v2.8/Tailwind v4 setup — replaced app-wide with a self-built `Tooltip.tsx`
- Shipped a real dark/light mode (not scoped in this plan or even this phase) after the user asked for it mid-session, using the same CSS-custom-property mechanism Phase 5 built for white-labeling — no architecture rework needed, it composed cleanly
- Sidebar redesigned: matches the header's gradient color, has a persisted expand/collapse toggle for labels, and an animated active-item indicator (framer-motion `layoutId`) — `framer-motion` (a Phase 5 dependency, unused until now) is now actually wired into the app
- Migrated every hardcoded `text-slate-*`/`text-red-*` class in the app to a new semantic text-token system so dark mode affects text, not just backgrounds

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src/hooks/useEntities.ts` | Created | TanStack Query hook for `GET /devices`/`GET /assets`, paginated/searchable |
| `frontend/src/widgets/EntityListWidget.tsx` | Created | Reusable HeroUI `Table` widget (loading/error/empty states); restyled per user feedback (bordered card, centered columns, header/row treatment) |
| `frontend/src/app/devices/page.tsx` | Modified | Real data via `useEntities('DEVICE')` + `EntityListWidget` |
| `frontend/src/app/assets/page.tsx` | Modified | Real data via `useEntities('ASSET')` + `EntityListWidget` |
| `frontend/src/components/Tooltip.tsx` | Created | Custom Tailwind + framer-motion tooltip, replacing HeroUI's broken one |
| `frontend/src/hooks/useTheme.ts` | Created | Dark/light mode toggle — flips `dark` class on `<html>`, persists to `localStorage` |
| `frontend/src/components/Sidebar.tsx` | Modified | Full redesign: gradient background matching header, expand/collapse toggle, animated active pill, theme toggle button, custom Tooltip usage |
| `frontend/src/app/layout.tsx` | Modified | Inline anti-flash script — applies stored/system theme before first paint |
| `frontend/src/app/globals.css` | Modified | `:root.dark` override block (surface/border/muted); new `--color-heading/body/faint/danger` text tokens (light + dark values) |
| `frontend/tailwind.config.ts` | Modified | New `heading`/`body`/`faint`/`danger` color tokens mapped to the CSS vars above |
| `frontend/src/app/login/page.tsx` | Modified | Migrated hardcoded `text-slate-*`/`text-red-*`/`border-slate-300` to the new semantic tokens |
| `frontend/src/app/not-found.tsx` | Modified | Same text-token migration |
| `frontend/src/components/ComingSoon.tsx` | Modified | Same text-token migration |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Replace HeroUI `Tooltip` app-wide with a custom component | HeroUI's Tooltip reuses `@heroui/theme`'s `popover` slot styling, which rendered completely unstyled live (plain text, no box, no positioning) — same category of HeroUI v2.8/Tailwind v4 friction already hit once in Phase 5 | Any future tooltip need must use `components/Tooltip.tsx`, not `@heroui/react`'s `Tooltip` |
| Sidebar background = header gradient, not a separate navy token | Explicit user request; also simplifies the palette — one gradient pair now drives both surfaces | `--color-navy-950/900/800` tokens remain only for the Tooltip's dark background, no longer used for the sidebar itself |
| Sidebar/header stay visually constant across light/dark mode; only content surfaces (`surface`/`surface-card`/text tokens) flip | Common pattern (Vercel/Linear/ThingsBoard); avoids needing a second full navy palette for a dark-mode sidebar that's already dark-toned | Dark mode implementation stayed scoped to content tokens, smaller surface area to get right |
| New text-color tokens (`heading`/`body`/`muted`/`faint`/`danger`) instead of Tailwind's `dark:` variant on every element | Matches the existing CSS-var white-label mechanism (one place to edit, not scattered `dark:text-*` on every element); also means a future white-label retint covers text automatically | Every text color in the app must go through these tokens now — enforced by the fact hardcoded grays visibly break dark mode |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed (bug found live) | 1 | Real bug (HeroUI Tooltip unstyled), fixed cleanly, no scope creep beyond the fix itself |
| Scope additions | 4 (table restyle, sidebar redesign, dark/light mode, text-token migration) | All explicitly requested by the user live during this plan's verification step, not self-initiated; substantial but directly serves Phase 6/7's UI foundation |
| Deferred | 1 | Logged below |

**Total impact:** Plan 06-01's own 3 tasks completed exactly as scoped; the bulk of this session's time went into user-directed UI polish that wasn't in the original plan but is now load-bearing for every future Phase 6/7 page (text tokens, dark mode, sidebar).

### Auto-fixed Issues

**1. [UI bug] HeroUI Tooltip rendered unstyled**
- **Found during:** Task 3 verification (user screenshot showed a bare "Assets" tooltip with no box/positioning on Sidebar hover)
- **Issue:** `@heroui/tooltip` reuses `@heroui/theme`'s `popover()` slot classes; those classes were not visibly applying at runtime
- **Fix:** Built `components/Tooltip.tsx` (plain Tailwind + `framer-motion` `AnimatePresence`), removed HeroUI `Tooltip` import from `Sidebar.tsx`
- **Files:** `frontend/src/components/Tooltip.tsx` (new), `frontend/src/components/Sidebar.tsx`
- **Verification:** `tsc --noEmit` clean; visual confirmation deferred to the user's own browser check (no headless-browser tool available in this environment — see Next Phase Readiness)

### Deferred Items

- Skeleton loading states/theme — explicitly deferred to V2 per user request during this session, not part of Phase 6's scope
- Full dark-mode pass on any component beyond what shipped this session (login, EntityListWidget, ComingSoon, not-found, Sidebar/header) — no other pages exist yet in Phase 6 to check; 06-02/06-03 should use the new text tokens from the start rather than reintroducing hardcoded grays

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| No headless-browser tool (`chromium-cli`) available in this Windows dev environment | Fell back to `tsc --noEmit` + curl-verified real backend data + manual code review against HeroUI's actual installed type definitions (confirmed `align`, `isStriped`, `classNames`, `removeWrapper` props exist in the installed `@heroui/table@2.2.32`/`@react-types/table` before using them); final visual confirmation done interactively by the user in their own browser across several feedback rounds |

## Next Phase Readiness

**Ready:**
- `EntityListWidget` pattern proven and restyled — reusable as-is for Phase 7's Clients list
- Dark/light mode + semantic text tokens are now the established convention; 06-02/06-03 widgets (Attributes table, Alarms list, telemetry tiles) should use `text-heading`/`text-body`/`text-muted`/`text-faint`/`text-danger` from the start
- Sidebar's new custom `Tooltip.tsx` is the only tooltip primitive to use going forward

**Concerns:**
- No automated browser/screenshot verification tool was available this session — all UI correctness relied on `tsc`, code-level review of HeroUI's actual type defs, and the user's own interactive testing. If a `run`-skill browser driver becomes available, worth a retroactive visual pass.
- `EntityListWidget`'s `TABLE_CLASSNAMES` and the Sidebar's inline gradient are the only two spots still styled ad hoc outside the token system (by necessity — HeroUI `classNames` and inline gradients aren't literal Tailwind utility classes) — fine for now, just worth remembering if a white-label retint is done later.

**Blockers:** None.

---
*Built with PAUL Framework · iot_app*
*Phase: 06-entity-views, Plan: 01*
*Completed: 2026-08-02*
