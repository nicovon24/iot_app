---
phase: 11-editorial-rebrand
plan: 01
type: Summary
about: "iot-app"
---

# 11-01 Summary — Near-black/aqua-green rebrand + Editorial design system

**Status:** Applied (retroactive summary — written 2026-08-28, code shipped 2026-08-22/24). Covers two commits: `2aa7a7a` (palette + type system) and `91099a0` (Editorial boards applied to all ten screens). Not click-tested live; see Deferred below.

## What was built

- **`2aa7a7a` — Palette + type system:** near-black neutrals (`#050807` page, `#101614` card) with a single bright aqua-green accent (`#2ee89a`); `--color-on-accent` token added everywhere white-on-accent previously failed contrast; per-gradient `--gradient-*-ink` tokens; ten semantic type roles (`.t-display` … `.t-mono`) in `@layer components` replacing hand-rolled size/weight combos; Geist Mono applied to all telemetry values with tabular figures; `.glass-card` demoted to a quiet default, `.surface-raised`/`.surface-overlay` added above it; hairline borders desaturated from brand green; Tailwind radius scale overridden globally; `TABLE_CLASSNAMES` unified from 6 drifted copies into one factory; alarm severity unified from 3 divergent definitions into one; maps defaulted to CartoDB Dark Matter.
- **`91099a0` — Editorial boards applied to all ten screens:** direction approved in a Claude Design canvas (`Overview Redesign.dc.html`, boards 1c/2a/3a-3g/4b) — reverses part of the previous pass deliberately (elegance via grid/2px rules/zero radius/Archivo, not glow/gradients/rounded glass). Near-black grounds refined further (`#080b0a`/`#0b100e`/`#0c100e`); Archivo replaces Inter; shared `PageHeader` (42px title, 96×2px accent rule) opens all nine authenticated screens, shell title bar removed (was duplicating a title and costing 80px/screen); `RuledTable` replaces HeroUI tables on five list screens; Admin's Miller columns become hairline divisions of one surface; Login rebuilt as a full-bleed console. Map markers gain two orthogonal state axes (severity color + reachability fill), severity regrouped to 3 bands, connectivity reads TB's native `active` attribute, per-marker alarm queries consolidated into one existing call, marker icon memoised (was rebuilding Leaflet DOM every render).
- **88 files touched total** across both commits (frontend only) — `globals.css`, `tailwind.config.ts`, `login/page.tsx`, `dashboard/page.tsx`, `Sidebar.tsx`, all chart/tile/table widgets, both Admin panels, map components, `EntityMapMarker.tsx`, `useFleetConnectivity.ts`/`useFleetStatus.ts` (new hooks), `MillerColumn.tsx`/`RuledTable.tsx`/`PageHeader.tsx` (new shared components).

## Key decisions made (not already captured elsewhere)

- Design direction was iterated in a Claude Design canvas before being applied to code — first documented instance of that workflow in this repo's history.
- Deliberately reverses part of the prior visual pass (glow/gradients/rounded glass → flat/2px-rule/zero-radius) rather than layering on top of it.
- `useFleetPositions` moved to its own module specifically to break an import cycle the shared status hook would otherwise have created.

## Verification

- `contrast.check.ts` extended and used as the contrast gate for the new palette — asserts the inverted invariants (dark-on-bright-accent, etc.), resolves token aliases, and has a cycle guard against `@theme`'s self-references.
- No `tsc --noEmit` or `next build` result stated in either commit — unlike most other phases in this repo, a clean build was not explicitly confirmed in the record.
- No live browser check reported.

## Deferred / not done

- **Real browser click-through across all ten screens** — not exercised. Same outstanding item already open for Phase 10 (dashboard builder, since 2026-08-05) and Phase 11 (units/widgets, since 2026-08-12); this phase adds to that shared debt, tracked as one item in STATE.md rather than a third separate row.
- No explicit `tsc --noEmit`/`next build` confirmation recorded — worth running before further work lands on top.

---

**A separate, unrelated fix landed in the same window** (`29214ce`, 2026-08-22): `getSessionToken()` returned a stale module-level variable instead of reading through to `sessionStorage`, causing silent 401s after any hot-reload of a sibling module under `lib/`. Not part of this phase's design work — recorded in `STATE.md` Decisions as a standalone session fix, same pattern used for other one-off bug fixes in this repo's history.
