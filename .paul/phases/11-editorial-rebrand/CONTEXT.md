# Phase Context

**Phase:** 11 — Editorial rebrand (frontend visual system)
**Generated:** 2026-08-28 (retroactive — written after the phase's code shipped)
**Status:** Code-complete, applied 2026-08-22/24 by Ulises-I-M outside the PAUL loop (no `/paul:discuss`/`/paul:plan` beforehand). This CONTEXT.md and its SUMMARY are retroactive documentation, not a plan consumed before the fact. Numbered Phase 11 (inserted ahead of units-and-widgets/testing-harness, which shifted to 12/13) since it landed chronologically before both in real terms — Ulises's commits (2026-08-22/24) predate this session's numbering work but the units/widgets phase (2026-08-12) predates the rebrand's actual code; the insertion point favors keeping units-and-widgets and testing-harness adjacent (12→13) over strict commit-date order.

## Goals

- Replace the prior control-room cyan/violet palette (see STATE.md Addendum 2, several dark-theme iterations) with a near-black + aqua-green (`#2ee89a`) system, and add the typographic hierarchy the app never had (87% of text nodes sat at one of two sizes, six weights total in use).
- Apply the "Editorial" design direction — approved in a Claude Design canvas (`Overview Redesign.dc.html`, boards 1c / 2a / 3a-3g / 4b) — across all ten authenticated screens: Archivo typeface, radius 0, a shared `PageHeader`, `RuledTable` replacing HeroUI tables on list screens.
- Give map markers real two-axis state (severity + reachability) instead of a single boolean, while touching map-adjacent files anyway.

## How this was scoped

Chat-driven, outside PAUL. No `CONTEXT.md`/`PLAN.md` existed before the work; the design direction was iterated in a Claude Design canvas and then applied directly across the codebase in two commits. This document and the accompanying SUMMARY were written after the fact, from the commit history, to close the same documentation gap already flagged once before (STATE.md's "Addendum 3" pattern) — the risk being that if this code is ever reverted or reworked, the reasoning behind it is only in `git log`, not in any file `/paul:*` commands read.

## Key decisions (extracted from commit bodies, not re-litigated here)

- Bright accent color breaks the "white ink on accent" invariant the codebase held in 42 places (1.60:1) — accent surfaces now carry a dedicated `--color-on-accent` (11.96:1); `.btn-accent`/`.badge-accent` name the surface+ink pair so they can't drift apart again.
- Status gradients no longer share one ink (ok/info light, danger dark) — each declares its own `--gradient-*-ink`, read by `CountTileWidget` the same way it already read `-from`/`-to`.
- No light focus ring clears 3:1 on the bright accent — accent-backed controls flip to a dark ring instead; the top header stops being an accent banner (keeps rings off large green areas).
- `.glass-card` (60 uses, blur+shadow) stops being the default surface — flat fill + hairline is now the default, `.surface-raised`/`.surface-overlay` above it, blur reserved for dialogs.
- Hairline borders stop being green — 88 borders were spending the accent color on chrome instead of state.
- Radius 0 applied by overriding Tailwind's scale (not new alias classes) — ~120 existing `rounded-*` usages inherit it with zero call-site changes.
- `RuledTable` replaces HeroUI tables on the five list screens — HeroUI wraps rows in a bordered/radiused container that can't bleed to the page gutter, which the "ruled document" reading requires.
- A shared `PageHeader` (42px title, 96×2px accent rule) opens all nine authenticated screens — replaces four drifted h1 sizes and a duplicated title in the shell's own title bar (removed, saved 80px of height on every screen).
- Map markers gain two orthogonal axes on one mark: color = alarm severity band, fill = reachability (hollow = offline) — previously one boolean discarded severity entirely.
- Severity groups into 3 bands, not 5 — a 9px diamond doesn't hold 5-way resolution, and nothing in this repo configures alarm rules/device profiles, so `alarm.type` is free-form tenant text that can't be reliably enumerated finer than that.
- Connectivity reads ThingsBoard's native `active` device attribute rather than inventing a staleness rule; Assets are skipped (`active` is device-only).
- Per-marker alarm queries consolidated into the one call that already returned every alarm — net request count goes down despite adding connectivity lookups.
- `contrast.check.ts` extended to assert the inverted contrast invariants, with token-alias resolution and a cycle guard (the `@theme` block self-references and would otherwise recurse).

## Verification done

- `contrast.check.ts` — extended, used as the WCAG contrast gate for the new palette (same pattern the repo already used pre-rebrand).
- No `tsc --noEmit`/`next build` result recorded in either commit message — not confirmed clean, unlike most other phases in this repo's history which state it explicitly.
- **No browser click-through reported for any of the ten screens.** Same gap already open for Phase 10 (dashboard builder) and Phase 11 (units/widgets) — this phase adds to that debt rather than creating a new, separate one.

---
*This file is retroactive: written after the code shipped, not before. It exists to close the documentation gap, not to inform a not-yet-done implementation.*
