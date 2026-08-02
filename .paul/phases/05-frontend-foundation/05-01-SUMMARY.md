---
phase: 05-frontend-foundation
plan: 01
subsystem: ui
tags: [nextjs, tailwind, heroui, app-router, sidebar, icons, white-label]

requires: []
provides:
  - "Next.js 16 App Router app in frontend/, TypeScript, Tailwind v4 + HeroUI v2 wired correctly"
  - "Fully CSS-variable-driven theme (navy-950/900/800, accent, accent-soft, surface, surface-card, border, muted, gradient-header-from/to) — swappable at runtime for future white-labeling"
  - "Icon-only sidebar rail (lucide-react + HeroUI Tooltip) — data-driven from NAV_ITEMS, 4 active + 3 coming-soon"
  - "Gradient header bar showing the current page's title dynamically (derived from route via NAV_ITEMS)"
  - "Locked-height app shell (h-screen + overflow-hidden) — only the main content area scrolls, sidebar/header never do"
  - "Placeholder pages for Dashboard/Devices/Assets/Alarms (200, not 404) + a custom themed not-found page for any other route"
  - "All UI copy in English (supersedes the original 'UI in Spanish' PROJECT.md requirement, per explicit user decision)"
affects: [05-02-api-ws-clients, 05-03-login, 06-entity-views, 07-client-wizard-ui]

tech-stack:
  added: ["next@16.2.12", "react@19.2.4", "tailwindcss@^4", "@heroui/react@^2.8.10", "@heroui/theme@^2.4.26", "framer-motion", "lucide-react"]
  patterns:
    - "Tailwind v4 CSS-first config (@import 'tailwindcss') combined with a legacy JS tailwind.config.ts loaded via @config, needed because @heroui/theme's plugin.js still targets Tailwind v3's plugin() API despite declaring a >=4.0.0 peer dependency"
    - "Every Tailwind color token resolves to a var(--color-*) CSS custom property (defined once in globals.css :root) — a white-label theme retints the whole app via runtime CSS variable overrides, no rebuild"
    - "Nav items as typed data (NavItem[] with an icon component reference), not hardcoded JSX per link — Phase 6/7 extend by flipping comingSoon: false and adding routes"
    - "App shell height is locked (h-screen on the root flex container, overflow-hidden on shell/sidebar, overflow-y-auto only on <main>) so the icon rail and header never scroll away from view"

key-files:
  created:
    - frontend/package.json
    - frontend/tailwind.config.ts
    - frontend/postcss.config.mjs
    - frontend/src/app/providers.tsx
    - frontend/src/app/not-found.tsx
    - frontend/src/app/dashboard/page.tsx
    - frontend/src/app/devices/page.tsx
    - frontend/src/app/assets/page.tsx
    - frontend/src/app/alarms/page.tsx
    - frontend/src/components/AppLayout.tsx
    - frontend/src/components/Sidebar.tsx
    - frontend/src/components/ComingSoon.tsx
    - frontend/src/lib/nav-items.ts
  modified:
    - frontend/src/app/layout.tsx
    - frontend/src/app/page.tsx
    - frontend/src/app/globals.css

key-decisions:
  - "UI stack: Tailwind CSS + HeroUI, user decision, no prior choice existed"
  - "Visual direction: dark navy + electric blue 'modern industrial dashboard', later refined to an icon-only sidebar rail + gradient header after the user shared a ThingsBoard-style reference image"
  - "UI language switched to English — supersedes PROJECT.md's original 'UI in Spanish' requirement, explicit user direction, PROJECT.md updated accordingly"
  - "@heroui/react pinned to ^2.8.10 (not the newest ^3, a React-Aria-based rewrite with a completely different API and no HeroUIProvider) — matches @heroui/theme@^2.4.26's actual plugin shape"
  - "App shell scroll is locked at the layout level (not just visually) so the sidebar/header are always fully visible regardless of main content length"

patterns-established:
  - "Color tokens live in globals.css as CSS custom properties, consumed via tailwind.config.ts's theme.extend.colors (each value a var() reference) — never hardcode hex values in component files"
  - "Sidebar nav is fully data-driven from NAV_ITEMS (now including an icon field); adding a real page in Phase 6/7 means routing the page + removing comingSoon, not restructuring the sidebar"
  - "Every top-level nav route gets a placeholder page.tsx (ComingSoon component) until its real phase lands, instead of leaving Next.js's default 404 exposed"

duration: ~2.5h across the session (initial scaffold + a Tailwind v4/HeroUI compatibility fix + a full design revision pass based on user feedback)
completed: 2026-08-02T00:00:00Z
description: "Next.js App Router scaffold with Tailwind v4 + HeroUI v2, fully CSS-variable-driven theme, icon-only sidebar rail with gradient header and dynamic page titles, English UI, and placeholder pages instead of 404s"
type: Summary
about: "iot-app"
---

# Phase 5 Plan 01: Next.js + Tailwind + HeroUI scaffold Summary

**`frontend/` is a running Next.js App Router app with a locked-height shell: an icon-only dark-navy sidebar rail (7 nav items, 4 active/3 coming-soon), a gradient header showing the current page's title, a fully CSS-variable-driven color system ready for future white-labeling, English UI copy, and styled placeholder pages instead of raw 404s for every nav-linked route.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2.5h (scaffold + compatibility fix + design revision) |
| Tasks | 2 planned tasks + 3 rounds of user-driven design revisions, all applied in this session |
| Files created/modified | 19 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Next.js dev server runs | Pass | `npm run dev --workspace=frontend` starts cleanly on `localhost:3000`, verified via `curl` returning HTTP 200 across multiple restart cycles |
| AC-2: Base layout renders with sidebar nav | Pass | Verified via fetched HTML at each revision: final state is an icon-only rail with all 7 items (Dashboard, Devices, Assets, Alarms active; Clients, Users, Settings visually disabled), tooltips confirmed via HeroUI `Tooltip` markup |
| AC-3: Tailwind + HeroUI wired correctly | Pass | Generated CSS bundle contains both custom color utilities (`bg-navy-950`, `bg-accent`, `bg-navy-900/40`, etc.) and HeroUI-generated styles — confirmed the plugin is actually active |
| AC-4: TypeScript compiles clean | Pass | `npx tsc --noEmit` passes with no errors after every revision round |

## Accomplishments

- First real, runnable code in `frontend/` — previously only empty placeholder folders existed
- Icon-only sidebar rail matching a ThingsBoard-style reference dashboard the user shared, with a gradient header and per-page dynamic titles
- Every color in the app resolves to a CSS custom property — the explicit mechanism requested for future white-label/dynamic branding, verified by inspecting the generated CSS bundle
- No more raw Next.js 404s on any nav-linked route; a themed custom not-found page covers everything else
- UI language decision revised to English mid-session, applied consistently and reflected in PROJECT.md

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/package.json` | Created | Next.js + Tailwind v4 + HeroUI v2 + lucide-react + framer-motion deps, workspace-compatible |
| `frontend/tailwind.config.ts` | Created | Legacy JS config loaded via `@config`; `theme.extend.colors` maps every token to a `var(--color-*)`; registers `heroui()` plugin |
| `frontend/postcss.config.mjs` | Created | `@tailwindcss/postcss` v4 plugin |
| `frontend/src/app/globals.css` | Modified | Full CSS custom-property token set (`navy-950/900/800`, `accent`/`accent-soft`, `surface`/`surface-card`, `border`, `muted`, `gradient-header-from/to`) + Tailwind v4 `@import`/`@config` |
| `frontend/src/app/providers.tsx` | Created | `HeroUIProvider` client wrapper |
| `frontend/src/app/layout.tsx` | Modified | `lang="en"`, English metadata, `h-full flex flex-col overflow-hidden` body (scroll lock), wraps `{children}` in `Providers` + `AppLayout` |
| `frontend/src/app/page.tsx` | Modified | Uses shared `ComingSoon` component, English copy |
| `frontend/src/app/not-found.tsx` | Created | Themed 404 replacement — keeps the app shell (sidebar/header) instead of Next's bare default page |
| `frontend/src/app/dashboard/page.tsx`, `devices/page.tsx`, `assets/page.tsx`, `alarms/page.tsx` | Created | Placeholder pages so every active nav link returns 200 with a styled message instead of 404, until Phase 6 builds real content |
| `frontend/src/components/AppLayout.tsx` | Created | `h-screen overflow-hidden` shell; gradient header deriving the page title from the route via `NAV_ITEMS`; scrollable `<main>` |
| `frontend/src/components/Sidebar.tsx` | Created | Icon-only rail (64px), `lucide-react` icons, HeroUI `Tooltip`, active-route highlight, coming-soon items shown with a subtle navy background + muted icon color (not flat opacity) |
| `frontend/src/components/ComingSoon.tsx` | Created | Shared placeholder-page component, reused across all not-yet-built routes |
| `frontend/src/lib/nav-items.ts` | Created | `NAV_ITEMS: NavItem[]` (label, href, icon, comingSoon) — the single data source for the whole system's navigation, now in English |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Tailwind CSS + HeroUI as the frontend UI stack | User decision, no prior choice existed | Phase 6/7 build on this stack |
| Icon-only sidebar rail + gradient header, dark navy + electric blue | User shared a ThingsBoard-style reference image and asked for that look | Established the final visual language for Phase 6/7 |
| UI language switched to English | Explicit user direction mid-session; supersedes PROJECT.md's original "UI in Spanish" requirement | PROJECT.md updated with a dated decision entry; all future frontend copy should be English unless revised again |
| `@heroui/react@^2.8.10` (not `^3`) | `^3` is a React-Aria-based rewrite with no `HeroUIProvider`; caused a real runtime crash when mismatched with `@heroui/theme@2.4.26` | Any future HeroUI upgrade must deliberately evaluate the v3 migration |
| `tailwind.config.ts` (legacy JS config) loaded via `@config`, colors expressed as `var(--color-*)` | `@heroui/theme@2.4.26`'s plugin requires Tailwind v3's plugin API, absent in v4, despite its `>=4.0.0` peer claim; and the user wants dynamic/white-label colors, which requires CSS-variable indirection anyway | Both problems solved by the same mechanism — plugin compatibility via `@config`, dynamic theming via `var()` |
| App shell scroll locked via `h-screen`/`overflow-hidden` at every layout level, only `<main>` scrolls | User explicitly asked the sidebar to never scroll, capped at 100% viewport height | Any future full-page content must scroll inside `<main>`, not the document body |
| Every nav-linked route gets a placeholder `page.tsx` instead of relying on Next's 404 | User found the default 404 jarring when clicking nav links before Phase 6 pages exist | Phase 6 replaces these placeholders with real content, not new files |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Real dependency-compatibility bugs, not scope creep |
| Scope additions | 1 | User-driven design revision pass (icon sidebar, English, scroll-lock, placeholder pages, 404) beyond the plan's original text-nav-only scope |

**Total impact:** The plan's original intent (Tailwind + HeroUI, dark theme, working sidebar) was fully delivered; the final implementation is a substantial upgrade over the original spec (icon rail vs. text list, dynamic page titles, English, scroll lock, placeholder pages) driven by direct user feedback during and after APPLY, not scope creep from Claude.

### Auto-fixed Issues

**1. [Bug] `@heroui/react@^3` (auto-resolved by an unpinned `npm install`) has no `HeroUIProvider`**
- **Found during:** First `npx tsc --noEmit` run
- **Fix:** Pinned `@heroui/react@^2.8.10` + `@heroui/theme@^2.4.26`
- **Files:** `frontend/package.json`

**2. [Bug] `@heroui/theme@2.4.26`'s Tailwind plugin targets the v3 plugin API, not v4's `@plugin` directive**
- **Found during:** First dev-server run — `TypeError: b is not a function`, traced to `@heroui/theme/dist/plugin.js` requiring the nonexistent `tailwindcss/plugin.js`
- **Fix:** Kept Tailwind v4 but added a legacy `tailwind.config.ts` loaded via `@config` — Tailwind v4's documented bridge for not-yet-v4-native JS plugins
- **Files:** `frontend/tailwind.config.ts` (created), `frontend/src/app/globals.css`
- **Verification:** Dev server starts clean; CSS bundle contains both custom and HeroUI classes; `curl` returns 200 with expected content

### Scope Additions

User requested a full design revision pass after seeing the initial text-based sidebar, driven by a ThingsBoard reference screenshot and several follow-up requests:
- Icon-only sidebar (lucide-react + Tooltip) replacing the original text-label sidebar
- Gradient header bar with dynamic per-page title (derived from route)
- Full switch to English UI copy (including a PROJECT.md decision update)
- App shell scroll lock (sidebar/header always visible, only content scrolls)
- Better-contrast styling for coming-soon icons (subtle navy background + muted color, not flat opacity)
- Placeholder pages for every active nav route + a themed custom 404, avoiding Next.js's default error page

All of these were explicitly requested by the user across several follow-up messages in the same session and are reflected in the `key-files`/`key-decisions` above rather than treated as separate plans, since they're refinements of 05-01's own deliverable (the sidebar/layout shell), not new scope belonging to a different phase.

## Next Phase Readiness

**Ready:** The full app shell (sidebar, header, theming, routing scaffolding) is in place for Phase 6 (real Devices/Assets/Alarms/Dashboard content + widgets) and Phase 7 (Clients wizard) to build directly on top of.
**Concerns:** `@heroui/theme`'s Tailwind-v4 peer declaration is currently misleading (its plugin isn't actually v4-native) — re-check this when HeroUI ships a true v4-native plugin before removing the `@config` bridge.
**Blockers:** None.

---
*Phase: 05-frontend-foundation, Plan: 01*
*Completed: 2026-08-02*
