# Phase Context

**Phase:** 9.1 — Visual modernization
**Generated:** 2026-08-05
**Status:** Ready for planning

## Goals

- Move the app's look away from the current ThingsBoard-style dark-navy/electric-blue rail (Phase 5/6 direction) toward a lighter, glassmorphic, purple/indigo-accented design the user shared as a reference mockup.
- Restyle every screen **except the map-based ones**: Dashboard, Devices, Assets, Admin, Alarms, Clients, Users, White Label, Settings, and the Login screen. The user was explicit: "quitando los mapas quiero actualizar todo lo demás" — the per-entity Map tab, the fleet-wide `/maps` page, and any embedded map widget on the Dashboard keep their current Leaflet-based implementation and styling untouched in this phase.
- Land this as a pure visual/styling pass — no new data, no new routes, no behavior changes. Every screen keeps the exact data it renders today; only tokens, components, and layout chrome change.

## Reference Design (from the shared mockup)

The mockup is a static HTML/CSS reference (not production code) the user is treating as the target look. Key tokens and patterns extracted from it:

**Typography & base**
- Font: Inter (variable weights 400–800), replacing the current default stack.
- Base page background: light neutral `#eef0f6` (a real shift from the current dark-navy-first theme — needs confirmation at planning time whether this replaces dark mode entirely or becomes the new light-mode default alongside a matching dark variant).

**Color / accent**
- Primary accent is a purple→indigo gradient: `linear-gradient(135deg, #818cf8, #c084fc)` — used on the logo badge, primary buttons, active nav item background, avatar badges, and toggle-switch "on" state.
- Secondary accent gradients used for stat-card icon badges and status dots (green `#34d399→#059669` for "active/ok", red `#fca5a5→#f87171` for alarms/danger, cyan `#67e8f9→#67E8F9` for assets).

**Sidebar**
- Dark gradient rail: `linear-gradient(165deg, #12142b 0%, #1c2049 55%, #2a2470 100%)`, with a soft decorative radial-blur blob in the top-right corner for depth.
- Collapsible: an icon-only rail state (icons only, no labels) and an expanded state (icons + labels), toggled by the user — a UI capability that doesn't exist in the current sidebar.
- Active nav item: soft accent-gradient background wash + white text + subtle border; inactive items are muted white text; disabled/not-yet-built items are further dimmed.
- Bottom of the sidebar: dark-mode toggle and a "hide labels" toggle, both as low-key icon+label rows.

**Cards & surfaces (the core "glassmorphism" pattern)**
- Every content panel (stat cards, list rows' containers, Admin's Miller-column panels, Login's form card) is a translucent white surface: `background: rgba(255,255,255,0.7–0.72)`, `backdrop-filter: blur(12–16px)`, `border: 1px solid rgba(255,255,255,0.6–0.7)`, `border-radius: 16–22px`, soft layered shadow (e.g. `0 10-20px 30-44px -12to-18px rgba(30,41,90,0.15-0.25)` or an indigo-tinted variant `rgba(99,102,241,0.25)`).
- This glass-card treatment is the single most distinctive element of the new look and should become the standard container component, replacing today's flat `--color-surface-card` panels.

**Components**
- **Stat tiles** (Dashboard counts): icon badge (gradient circle/square) + small uppercase label + large bold number, inside a glass card.
- **List rows** (Devices/Assets/Users lists): icon avatar (rounded square, gradient fill) + name (bold) + type/role (small muted uppercase) on the left, status/action affordances on the right, inside a glass card per row with hover background.
- **Admin panel**: glass-card columns (Miller-column pattern already exists functionally — Phase 8 — this phase only restyles it), "+ Add" as a small accent-colored text link in the column header, empty-state text centered and muted.
- **Toggle switches** (Settings, White Label): pill-shaped, accent-gradient when on, light-gray with a shadowed knob when off.
- **Login screen**: split-screen layout — left half a centered glass-card form (email, password with show/hide, "remember me", forgot-password link, gradient primary button); right half a full-bleed accent-gradient panel with a decorative icon grid and soft blurred circles. This replaces the current single-column dark login screen.
- Subtle entrance animation (`fadeUp`: opacity + translateY, ~0.4s ease) on card mount, used sparingly per screen.

**Alarms / empty states**
- A centered glass card with a large icon badge, a headline, and a muted subline — used for both "no active alarms" and other empty states, replacing today's plain empty-state text.

## Explicitly Out of Scope

- **All map-based UI**: the fleet `/maps` page (`FleetMapWidget`), the per-entity Map tab (`MapWidget`), and the Dashboard's embedded map panel. These keep their current Leaflet/CartoDB-tile implementation and existing styling (white/color tile toggle, `EntityMapMarker`) untouched — the user asked to exclude maps from this pass.
- No new screens, no new data-fetching, no new routes.
- No changes to `AdminAssetPanel`/`AdminDevicePanel` functionality — Miller-column mechanics from Phase 8 stay as-is, only their visual chrome changes.
- Dark-mode strategy is an open question (see below), not decided by this context alone.

## Constraints

- Must not break any existing functional behavior — this is a component/token-level restyle, verified against the same interactions Phase 5–8 already shipped (login, nav, list rows, Admin columns, alarms, settings toggles).
- Should build on the existing white-label CSS-custom-property mechanism from Phase 5 (`--color-*` tokens resolved at runtime) rather than hardcoding new hex values directly into components, so the upcoming white-labeling feature (mentioned by the user, not yet a scheduled phase) still works after this restyle.
- HeroUI/Radix components already in use (Dialog, Select, sonner toasts) should be reskinned via tokens/classNames where possible rather than replaced outright, unless a component genuinely can't achieve the glass-card look without replacement.

## Open Questions

- Does the new light glassmorphic look **replace** dark mode entirely, or does it become the light-mode variant with an equivalent dark glass variant designed alongside it? The current app has real light/dark mode support (Phase 6) that this must not silently break.
- Exact scope of the sidebar collapse/labels-toggle feature — is this a genuinely new interactive capability to build, or purely decorative in the mockup? (The current sidebar is already an icon-only rail with tooltips, not a toggle-based expand/collapse — needs a decision at planning time.)
- Whether the Login screen's split-screen right panel is worth the added layout complexity given the app's actual login flow, or should be simplified.

## Additional Context

- The reference mockup was shared as a self-contained HTML/CSS/JS bundle (not directly usable as production code — built with a different templating approach than this project's Next.js/Tailwind/HeroUI stack) — it documents the *visual target*, not implementation to copy wholesale.
- Split from a larger ask alongside Phase 9.2 (roles/users) and Phase 10 (dashboards) — this phase is purely visual and has no functional dependency on either.

---

*This file is temporary. It informs planning but is not required.*
*Created by /paul:discuss, consumed by /paul:plan.*
