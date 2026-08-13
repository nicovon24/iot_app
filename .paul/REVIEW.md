---
description: "iot_app — architecture/scalability review + Claude workflow retrospective"
type: Review
about: "iot-app"
---

# Review — 2026-08-12

**Update 2026-08-12 (later same day):** acted on this review's findings, no formal PAUL plan (user chose "directo, sin PAUL"). See per-section notes below for what changed and what was deliberately left as-is.

Snapshot after Phase 12 (telemetry units + new widget types) applied. Scope: is the frontend
dashboard system scalable, is the backend scalable, and how well is Claude/PAUL being used in
this project. No code changed by this review — diagnosis only.

## Frontend — dashboard/widget system

**Verdict: the problem is localized, not general.** Pages, domain hooks (`hooks/{assets,entities,
users,dashboards}/`), and admin/forms components are reasonably modular. The pain is concentrated
in the widget config panel, and it has one root cause.

### Root cause: config-panel state is flat, not per-type

| File | Lines | Problem |
|---|---|---|
| `frontend/src/dashboards/widget-config/AddWidgetPanel/index.tsx` | 554 | ~25 `useState` calls, one per possible config field across all 19 widget types (`min`, `max`, `unit`, `decimals`, `stacked`, `sparkline`, `text`, `align`, `xKey`, `yKey`, `groupBy`, `gaugeStyle`, `unitsByKey`...) |
| `frontend/src/dashboards/widget-config/AddWidgetPanel/ConfigureStep.tsx` | 433 | Mirror of the above: a long chain of `{widgetType === 'x' && <Field/>}` instead of each type owning its own form |
| `frontend/src/dashboards/renderer/ChartCells.tsx` | 384 | Each chart cell repeats the same skeleton (resolve window → run history hook → build props → render) |
| `frontend/src/dashboards/widget-config/widget-registry.tsx` | 404 | UI metadata registry — correct idea, but doesn't yet drive form generation, only gating |

Every new widget type touches `AddWidgetPanel/index.tsx` in the same 5 spots: declare `useState`,
seed it in the edit-effect, clear it in `resetTypeConfig()`, write it conditionally in
`buildConfig()`, pass it as a prop to `ConfigureStep`. Confirmed directly — Phase 12's 5 plans
each repeated this pattern. `widget-registry.tsx` already declares `entity`/`telemetryKey`/
`multiTelemetryKeys`/`supportsAllScope` declaratively; it does **not** yet declare each type's own
config fields, so the panel still asks `widgetType === 'x'` by hand for every field.

### Duplication found

- `GaugeWidget.tsx`/`BatteryWidget.tsx`/`RssiWidget.tsx` — same prop shape (`label, value, min,
  max, unit, ts`), same SVG structure. Battery/Rssi are effectively "Gauge with a fixed style +
  defaults" (~180 combined lines that could be one component + two default configs).
  **Fixed 2026-08-12**: extracted `GaugeShell.tsx` (label header + value/timestamp footer, the
  part all three pasted identically); each widget keeps its own SVG as a `children` slot. Not
  merged into one component with default-config variants — the three SVGs are genuinely
  different shapes (dial/thermometer/bars vs. a fill bar vs. stepped bars), so collapsing further
  would have meant a config-driven SVG generator, more indirection than the ~15 lines saved.
- The backend (`backend/src/dashboards/widget-registry.ts`) and frontend widget registries are
  hand-kept in sync with no test asserting they match — already flagged as debt in STATE.md.
  **Not touched** — out of this pass's scope (needs the deferred test harness, Phase 12, to add
  a real assertion; nothing to refactor without one).
- The "unit per key" config block built in Phase 12 (12-04) is near-identical JSX pasted into 3
  places (value-cards, timeseries-table, multi-key-chart) rather than one shared control.
  **Not reproducible 2026-08-12** — re-checked `ConfigureStep.tsx` directly: this is already a
  single shared conditional block (`meta.multiTelemetryKeys && meta.telemetryKey === 'none'`),
  not 3 pasted copies. Likely described an intermediate state mid-Phase-12 that got consolidated
  before this review was written, or the review over-generalized from the pattern above. No
  change made.

### What's already right, don't touch

- `renderer/{Card,Chart,Table,Alarm,Map}Cells.tsx` split by widget family.
- `datasource/*.ts` — reusable hooks, cleanly separated from rendering.
- The registry-as-source-of-truth idea itself — just needs to own more (config field shape, not
  only gating flags).

### The lever

Extend `WidgetTypeMeta` to also declare each type's config fields declaratively (shape, default,
which UI control), and generate `ConfigureStep`'s form + `AddWidgetPanel`'s state/seed/reset/build
from that data instead of hand-writing 5 touchpoints per type. This collapses growth from
"+5 edits in 2 shared files per widget" to "+1 registry entry."

**Partially done 2026-08-12.** Added `AddWidgetPanel/type-config-fields.ts` (a declarative
`FieldSpec` table: state key, default, `fromConfig`/`shouldSave`/`toConfig`) and
`use-type-config.ts` (generic seed/reset/build over that table), and migrated the 15 fields that
are genuinely "one state, one control, no cross-field dependency" — `agg`, `gaugeStyle`,
`groupBy`, `scatterMode`, `interpolation`, `severities`, `statuses`, `text`, `align`, `stacked`,
`sparkline`, `xKey`, `yKey`, `xUnit`, `yUnit`. `AddWidgetPanel/index.tsx` dropped from ~25
`useState` to 10.

**Deliberately not migrated**: `unit`/`decimals`/`unitTouched` (auto-suggest-on-key-pick +
touched-tracking), `telemetryKey`/`telemetryKeys` (drives that same auto-suggest, resets on
entity change), `entityId`/`scope`/`entityKind` (reset each other), `unitsByKey` (keyed per
telemetry key, its own merge logic), `min`/`max` (cross-validated against each other), and
`title`/`action`/`dataKeys` (always-present, type-independent). These have real cross-field
logic — folding them into the generic table would have hidden that logic behind indirection
rather than simplifying it. `ConfigureStep.tsx` itself (the `{widgetType === 'x' && <Field/>}`
chain deciding what to *render*) was intentionally left as-is; the table only owns state
lifecycle + config serialization, not layout.

**Real bug caught mid-refactor, not shipped**: while writing the field table, `xKey`/`yKey` were
first assigned to `multi-key-chart` (copy-paste from thinking about scatter's own axis fields)
instead of `scatter`, which is the only type that actually has axis pickers — caught by
cross-checking every entry against `ConfigureStep.tsx` line-by-line before wiring the table in,
not by a test (none exist for this file). Left as a cautionary note for whoever extends this
table next: verify each new entry against the render logic, the table has no compiler check
that a field is wired to the type that actually renders its control.
`tsc --noEmit`/`next build` clean after the change; not click-tested in a browser (same
standing caveat as the rest of Phase 10/11's frontend work).

## Backend

**Verdict: solid module boundaries overall (standard NestJS one-module-per-domain), one real god
service.**

| File | Lines | Note |
|---|---|---|
| `backend/src/entities/entities.service.ts` | 429 | Does ref-resolution, paginated listing, customer-hierarchy scoping, CRUD for 3 entity kinds (Asset/Customer/Device), and TB Relations — 6 responsibilities in one file |
| `backend/src/dashboards/widget-registry.ts` | 314 | Large but *appropriately* — it's meant to be the single place widget-type Zod schemas live (explicit design decision, not drift) |
| Everything else | ≤ 202 | Comfortably sized, one responsibility each |

`entities.service.ts` is the one candidate for a split — e.g. `EntityRefResolutionService`
(ref-batch-resolve + Redis caching), `EntityScopeService` (hierarchy scoping), and per-kind CRUD
staying where it is or moving into `assets`/`customers`/`devices` services that already exist as
thin wrappers. Not urgent — it's a size/cohesion smell, not a bug, and the project's V1/V2
priorities have consistently been features over refactors (see STATE.md Decisions).

**Partially done 2026-08-12.** `EntitiesService` is injected in 13 files across the app, including
the global `CustomerScopeGuard` and `ws-auth.util.ts` — real `@Injectable` services for
`EntityRefResolutionService`/`EntityScopeService` would have meant changing dependency injection
in all 13, on the most security-sensitive code in the project (a real guard-ordering bug already
happened here once, see STATE.md Decisions). Chose the safer half: extracted ref-resolution
(`resolveRefs`/`toEntityRefs`/`collectRefs`/`mapWithRefs`, ~150 lines) into
`backend/src/entities/entity-ref-resolver.ts` as a plain class (not a NestJS provider),
instantiated once inside `EntitiesService`'s constructor and called via
`this.refResolver.mapWithRefs(...)`. `EntitiesService`'s public interface and every one of the 13
call sites are unchanged — this is a file-organization change, not an architecture change.
`entities.service.ts` dropped from 429 to 304 lines. Hierarchy-scoping
(`resolveScopedCustomerIds`/`isInScope`/`isScoped`) and the per-kind CRUD/Relations methods stay
where they are — a real service split (with DI changes) remains available later if the god-file
concern resurfaces, but wasn't worth the risk to auth-critical code for a readability-only win
today. `tsc --noEmit` and `nest build` both clean.

No other backend scaling concern found: guards, gateways, and the Prisma/TB split all stay within
their stated single responsibility.

## Claude/PAUL workflow — this session's retrospective

Asked for explicitly: how the flow and Claude/context usage went, based on recent changes.

**What worked well:**
- Delegating the Phase 12 design to two parallel Explore agents + a Plan agent (instead of me
  reading every file myself) kept the main thread's context light while still producing a
  detailed, pressure-tested design — the Plan agent's pushback (sparkline as a flag not a type,
  store unit symbols not ids, drop factor/offset) was concrete and changed the final plan for the
  better rather than being generic caution.
- Splitting Phase 12 into 5 vertical-slice PLAN.md files (not one big one) meant each could be
  applied, typechecked, and built independently — when 12-04 needed 12-01+12-02's output, that
  was a real dependency, not a reflexive one, and the wave ordering in the frontmatter reflected it
  honestly.
- Running `tsc --noEmit` + `next build` after **every** task, not just at the end, caught real
  issues immediately (the recharts `Formatter` type mismatch in `withUnit`) instead of compounding
  across 5 plans.

**What cost more than it needed to:**
- **PAUL doc upkeep tax.** Every phase/plan touch required editing ROADMAP.md, STATE.md, and often
  a CONTEXT.md, and those files are now large enough (400+ lines each) that edits routinely
  triggered pre-existing markdown-lint warnings unrelated to the actual change, adding noise to
  every tool result. The docs are valuable as a durable record, but the editing cost per phase is
  growing with file size, not staying flat.
- **Mid-session resequencing** (Phase 11 → Phase 12 → renamed to `tbd-testing-harness`) required
  touching ROADMAP.md, STATE.md, PROJECT.md-adjacent text, and the phase directory itself in the
  same turn — reasonable given the user's real change of mind, but it's the kind of churn that
  compounds if scope keeps getting reordered mid-flight rather than settled before phase creation.
- **Verification gap this session:** every plan was verified via `tsc`/`next build`/self-checks
  only — no real browser click-through (no browser tool available), same caveat Phase 10 already
  carries. That's now 2 phases deep with the same deferred verification, which is the kind of gap
  that should get closed before a 3rd phase stacks on top of unverified UI.
- **Ponytail/Caveman/Auto-mode stacking**: several persistent modes are active at once (ponytail
  full, caveman full, auto mode, PAUL). They didn't conflict this session, but it's worth naming
  that the terse caveman output style and PAUL's verbose phase-tracking prose are in some tension
  — PAUL's required STATE.md sections read naturally verbose, which is correct for a durable
  record but reads oddly paired with caveman's "drop the filler" instruction applied to
  chat responses in the same turn.

**Concrete suggestions:**
1. Before stacking a 3rd phase on unverified frontend work, spend one session just doing the
   browser click-through for Phase 10 + Phase 12 together — cheaper than deferring twice more.
2. Consider trimming STATE.md's `### Decisions` table periodically (archive rows older than N
   phases into a separate `DECISIONS-ARCHIVE.md`) — it's append-only today and will keep growing
   the edit cost of every future phase touch.
3. If the frontend widget-panel refactor above gets scoped as a real plan, that's a good candidate
   for the "complex, split into vertical slices" treatment Phase 12 already used successfully —
   same pattern, different subsystem.

## Follow-up: fixes applied 2026-08-12

No PAUL plan (user chose "directo, sin PAUL" for this pass). Summary:

| Item | Outcome |
|---|---|
| Gauge/Battery/Rssi shared wrapper duplication | Fixed — `GaugeShell.tsx` extracted |
| "Unit per key" config block pasted 3x | Not reproducible — already a single shared block, review was stale/over-generalized here |
| Config-panel god-file (`AddWidgetPanel`/`ConfigureStep`) | Partially fixed — 15 of ~25 state fields moved to a declarative table (`type-config-fields.ts` + `use-type-config.ts`); fields with real cross-field logic (unit auto-suggest, entity/scope resets, min/max validation) deliberately left as explicit code |
| Backend god-service (`entities.service.ts`) | Partially fixed — ref-resolution extracted to `entity-ref-resolver.ts` as a plain class, zero DI/call-site changes (13 consumers, including global auth guards, untouched); hierarchy-scoping and CRUD stay in place |
| Backend/frontend widget-registry drift (no test) | Not touched — needs the deferred test harness (Phase 12) first |

Verification: `tsc --noEmit` clean in both `backend/` and `frontend/`; `next build` and
`nest build` both clean. **Not click-tested in a browser** — same standing caveat as the rest of
Phase 10/11's frontend work; the config-panel change in particular touches every one of the 19
widget types' config forms and has not been exercised live.

---
*Created 2026-08-12, diagnosis only — no code or scope changes from this file.*
