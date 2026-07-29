# AGENTS.md — IoT Platform

## What This Is

Industrial IoT platform built with NestJS and ThingsBoard. Provides flexible client-based hierarchies, dynamic intermediate asset modeling, an advanced data classifier, customizable alarms, and a scalable multi-dashboard frontend.

- **Deploy target:** Vercel (frontend) + Render/Docker (backend + ThingsBoard)
- **Local dev:** Docker Compose (Postgres + ThingsBoard + NestJS backend)

## Monorepo Layout

```
iot_app/
├── frontend/             # React frontend
├── backend/              # NestJS backend
├── docs/                 # Documentation, specifications, and rules
│   ├── agents/           # Specialized subagent definitions
│   ├── rules/            # Strict domain rules (API, infrastructure, testing)
│   ├── adr/               # Architecture Decision Records
│   └── initial/           # Initial documentation for the project (made with Claude/AI)
├── AGENTS.md             # ← you are here (L1 Context)
├── VISION.md             # Product vision, business domain, and scope
├── ARCHITECTURE.md       # High-level architecture & ADR index
└── CURRENT.md            # Living state (now / next / blocked / shipped)
```

## Stack (current, authoritative)

| Layer | Technology |
| :--- | :--- |
| **Backend** | NestJS + Fastify adapter, Prisma (PostgreSQL), Redis, class-validator/class-transformer |
| **IoT Engine** | ThingsBoard Cloud / Docker (Devices, Assets, Telemetry, Rule Chains) |
| **Database** | PostgreSQL via Prisma (relational metadata: hierarchy, catalogs, configs) |
| **Frontend** | TypeScript, React + Zustand + TanStack Query, TailwindCSS |
| **Package Manager** | pnpm |

## Agent Roles

Each session should adopt **one** role. Do not mix roles in a single session.

- **Product** (`docs/agents/product.md`) — Spec, feature definition, scope, user flows.
- **Architect** (`docs/agents/architect.md`) — Design, ADRs, `ARCHITECTURE.md` updates, ThingsBoard modeling.
- **Developer** (`docs/agents/developer.md`) — Implementation on a specific plan (NestJS endpoints, frontend views).
- **Reviewer** (`docs/agents/reviewer.md`) — Code review, security, conventions, and validation.

## Domain Rules (L3)

Prescriptive rules loaded per agent session:

- `docs/rules/api.md` — Endpoint contracts, flexible hierarchy mapping, error formats.
- `docs/rules/infrastructure.md` — Deploy topology, environment variables, ThingsBoard connection, Docker setup.
- `docs/rules/testing.md` — Testing strategies, API mocks, device emulation.

## Pipeline

`SPEC → PLAN → TEST → CODE → REVIEW → PR (human)`

Each step produces a written artifact. Deployment is continuous: every completed task on `master` is potentially shippable.

## Git Workflow

- Never commit or push until the user explicitly confirms they have tested the changes, or the user orders a push.
- After finishing an implementation, report what changed and wait for the user's go-ahead before running any `git commit` or `git push`. This applies to all branches and all tasks, no exceptions.

Architectural decisions (the "why") live in `ARCHITECTURE.md` as ADRs — separate from the rules above.

## `CURRENT.md` Structure (do not deviate)

`CURRENT.md` must have exactly these four sections, in this order:

```markdown
# CURRENT.md
## Now (last updated: YYYY-MM-DD)
- Branch: `branch-name`
- Working on: [one sentence — what is being touched RIGHT NOW]

## Next (top 3, ordered by priority)
1. ...
2. ...
3. ...

## Blocked / Known issues
- ...

## Recently shipped (last ~7 days, older entries move to docs/changelog.md)
- YYYY-MM-DD — short description
```

If a section has nothing, write `- (none)`. Do not delete the section header.

## Session-Close Ritual (MANDATORY, every session that touched code)

Before ending any session that produced code changes, the agent **must** perform these steps in order. No exceptions.

1. Move stale entries out of `CURRENT.md` — anything in *Recently shipped* older than ~7 days, or anything in *Now* that is now done, gets cut and pasted into `docs/changelog.md` under a new dated heading (`## YYYY-MM-DD — branch-or-feature-name`).
2. Update `## Now` — bump the date, rewrite the one-sentence "Working on" to reflect the next thing.
3. Update `## Next` — reorder, remove what was just done, add what surfaced during this session.
4. Update `## Blocked / Known issues` — add anything new, remove anything resolved.
5. Update `## Recently shipped` — prepend today's date with a one-line summary of what shipped this session.
6. If an architectural decision was made — add an ADR to `ARCHITECTURE.md`. Do **not** log architectural decisions in `CURRENT.md` or `docs/changelog.md`.
7. Verify `CURRENT.md` is still ≤ ~80 lines. If it grew past that, move more entries to `docs/changelog.md`.

This is non-negotiable. Skipping it means the next session starts blind. The user does not need to ask for it — the agent does it automatically as the final step of any session that produced changes.

## Key Invariants

- **Never duplicate ThingsBoard entities:** Tenants, Customers (Clients), Assets, Devices, Telemetry, and Attributes live in ThingsBoard and are queried via its API. Do not create local database tables for them.
- **Flexible Hierarchy Rule:** Intermediate levels (Locations, Areas, Sections) are modeled as ThingsBoard Assets with a `hierarchyLevelId` attribute, connected via a single generic relation type (`"Contains"`). Labels and names per level are defined via `hierarchy_level_definitions`.
- **Generic Permissions:** Roles and granular permissions must point to any generic `tb_entity_id`, avoiding fixed scope limitations.
- **Data Classifier Fallback:** Telemetry visualization rules combine native data types from ThingsBoard, units stored in `telemetry_key_catalog`, and naming heuristics.
- **Code Comments Language:** Code comments must be strictly in **English** throughout.

## Telemetry Model and Units

- **Telemetry definitions:** A global `telemetry_definitions` model groups telemetry by logical type (`sensor_telemetry`) rather than per-device keys. Each definition includes `base_unit`, `decimals`, optional `min`/`max`, and a `default_widget`.
- **Unit catalog:** `unit_categories` (category + base unit) and `unit_conversions` (convertible units per category) hold conversion metadata only — a handful of static rows, never one per reading. Conversions use factor+offset for linear units; non-linear formulas may be supported later.
- **Per-user preferences:** `user_unit_preferences` allows users to choose display units per category; stored telemetry remains in the base unit.
- **Dashboard rules:** Dashboards may override presentation `widget_type` only; unit, decimals, min, and max always come from `telemetry_definitions` to ensure consistent units across views.
- **UI:** Add a dedicated "Telemetries" UI section to let admins register telemetry definitions, link raw ThingsBoard keys to `sensor_telemetry` types, and preview historical values formatted with the chosen definition.

## Language

All project documentation must be written in **English**. This applies to:

- All `.md` files in the root and `docs/` directories
- Code comments, JSDoc, and inline documentation
- Commit messages
- `CURRENT.md` session notes

The app UI itself remains in Spanish (targeting end users).

## What to Read First Per Task

Always start with `CURRENT.md` — it tells you what was done last session, what's in progress, and what comes next. Read it before anything else.

| Task type | Start here |
| :--- | :--- |
| Any session | `CURRENT.md` → then the task-specific file below |
| Backend feature / NestJS | `docs/rules/api.md` → NestJS app structure |
| Frontend feature / Dashboards | `frontend/AGENTS.md` |
| DB schema change (hybrid tables) | `docs/schema.dbml` or equivalent |
| Deploy / Environment | `docs/rules/infrastructure.md` |
| Codebase/architecture question | `graphify query "<question>"` (see `.claude/skills/graphify/SKILL.md`) |

## Knowledge Graph (graphify)

Project has a knowledge graph at `graphify-out/` (god nodes, community structure, cross-file relationships). For codebase questions run `graphify query "<question>"` first when `graphify-out/graph.json` exists; `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for concepts. Run `graphify update .` after code changes to keep it current.

## Response Style & Token Compression (MANDATORY)

- **Terse Output:** Cut all pleasantries, introductions, filler words, and meta-commentary.
- **Direct Signal:** Provide only exact code diffs, direct answers, or high-density bullet points.
- **No Explanation Wrappers:** Do not explain *what* you are going to do before doing it. Execute first, summarize in under 3 bullet points if necessary.
- **Code First:** If a task requires code modification, output the file changes directly without conversational preamble.
