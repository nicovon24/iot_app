# CLAUDE.md — Smart Industry IoT Platform

## What This Is

Industrial IoT platform built with FastAPI and ThingsBoard. Provides flexible client-based hierarchies, dynamic intermediate asset modeling, an advanced data classifier, customizable alarms, and a scalable multi-dashboard frontend.
Deploy target: Vercel (frontend) + Render/Docker (backend + ThingsBoard)
Local dev: Docker Compose (Postgres + ThingsBoard + FastAPI backend)

## Monorepo Layout

smart-industry-iot/
├── frontend/             # Next.js / React frontend
├── backend/              # FastAPI backend
├── docs/                 # Documentation, specifications, and rules
│   ├── agents/           # Specialized subagent definitions
│   ├── rules/            # Strict domain rules (API, infrastructure, testing)
│   └── adr/              # Architecture Decision Records
├── AGENTS.md             # ← you are here (L1 Context)
├── VISION.md             # Product vision, business domain, and scope
├── ARCHITECTURE.md       # High-level architecture & ADR index
└── CURRENT.md            # Living state (now / next / blocked / shipped)

## Stack (current, authoritative)

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python, FastAPI, Pydantic, SQLAlchemy/Drizzle equivalent |
| **IoT Engine** | ThingsBoard Cloud / Docker (Devices, Assets, Telemetry, Rule Chains) |
| **Database** | PostgreSQL (Relational metadata: hierarchy, catalogs, configs) |
| **Frontend** | TypeScript, React / Next.js, TailwindCSS |
| **Package Manager** | pip / poetry / pnpm (depending on workspace) |

## Agent Roles

Each session should adopt one role. Do not mix roles in a single session.
* **Product (`docs/agents/product.md`)** — Spec, feature definition, scope, user flows.
* **Architect (`docs/agents/architect.md`)** — Design, ADRs, `ARCHITECTURE.md` updates, ThingsBoard modeling.
* **Developer (`docs/agents/developer.md`)** — Implementation on a specific plan (FastAPI endpoints, frontend views).
* **Reviewer (`docs/agents/reviewer.md`)** — Code review, security, conventions, and validation.

## Domain Rules (L3)

Prescriptive rules loaded per agent session:
* `docs/rules/api.md` — Endpoint contracts, flexible hierarchy mapping, error formats.
* `docs/rules/infrastructure.md` — Deploy topology, environment variables, ThingsBoard connection, Docker setup.
* `docs/rules/testing.md` — Testing strategies, API mocks, device emulation.

## Pipeline

SPEC → PLAN → TEST → CODE → REVIEW → PR (human)

Each step produces a written artifact. Deployment is continuous: every completed task on `master` is potentially shippable.

## Git Workflow

Never commit or push until the user explicitly confirms they have tested the changes or the user orders to push it.
After finishing an implementation, report what changed and wait for the user's go-ahead before running any `git commit` or `git push`. This applies to all branches and all tasks, no exceptions.

## Context Management Protocol (MANDATORY)

Context for this project lives in **three files only**. Do not invent new ones. Do not duplicate information across them.

| File | Purpose | Lifetime | Max size |
| :--- | :--- | :--- | :--- |
| `CLAUDE.md` | Permanent rules, invariants, stack | Changes when architecture changes | ~150 lines |
| `CURRENT.md` | Live state: now / next / blocked / recent | Rewritten every session | ~80 lines |
| `docs/changelog.md` | Historical record of shipped work | Append-only, grows forever | unlimited |

Architectural decisions (the "why") live in `ARCHITECTURE.md` as ADRs — separate from the three above.

## CURRENT.md structure (do not deviate)

`CURRENT.md` must have exactly these four sections, in this order:
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

If a section has nothing, write `- (none)`. Do not delete the section header.

## Session-close ritual (MANDATORY, every session that touched code)

Before ending any session that produced code changes, the agent MUST perform these steps in order. No exceptions.
1. Move stale entries out of `CURRENT.md` — anything in *Recently shipped* older than ~7 days, or anything in *Now* that is now done, gets cut and pasted into `docs/changelog.md` under a new dated heading (`## YYYY-MM-DD — branch-or-feature-name`).
2. Update `## Now` — bump the date, rewrite the one-sentence "Working on" to reflect the next thing.
3. Update `## Next` — reorder, remove what was just done, add what surfaced during this session.
4. Update `## Blocked / Known issues` — add anything new, remove anything resolved.
5. Update `## Recently shipped` — prepend today's date with a one-line summary of what shipped this session.
6. If an architectural decision was made — add an ADR to `ARCHITECTURE.md`. Do NOT log architectural decisions in `CURRENT.md` or `docs/changelog.md`.
7. Verify `CURRENT.md` is still ≤ ~80 lines. If it grew past that, more entries need to be moved to `docs/changelog.md`.

This is non-negotiable. Skipping it means the next session starts blind. The user does not need to ask for it — the agent does it automatically as the final step of any session that produced changes.

## Key Invariants

* **Never duplicate ThingsBoard entities:** Tenants, Customers (Clients), Assets, Devices, Telemetry, and Attributes live in ThingsBoard and are queried via its API. Do not create local database tables for them.
* **Flexible Hierarchy Rule:** Intermediate levels (Locations, Areas, Sections) are modeled as ThingsBoard Assets with a `hierarchyLevelId` attribute, connected via a single generic relation type ("Contains"). Labels and names per level are defined via `hierarchy_level_definitions`.
* **Generic Permissions:** Roles and granular permissions must point to any generic `tb_entity_id`, avoiding fixed scope limitations.
* **Data Classifier Fallback:** Telemetry visualization rules combine native data types from ThingsBoard, units stored in `telemetry_key_catalog`, and naming heuristics.
* **Code Comments Language:** Code comments must be strictly in **English** for thingsboard and iotlogiq logic, and strictly in **Spanish** for posada dormis code.

## Language

All project documentation must be written in English. This applies to:
* All `.md` files in the root and `docs/` directories
* Code comments, JSDoc, and inline documentation
* Commit messages
* `CURRENT.md` session notes
The app UI itself remains in Spanish (targeting target users).

## What to Read First Per Task

Always start with `CURRENT.md` — it tells you what was done last session, what's in progress, and what comes next. Read it before anything else.

| Task type | Start here |
| :--- | :--- |
| Any session | `CURRENT.md` → then the task-specific file below |
| Backend feature / FastAPI | `docs/rules/api.md` → FastAPI app structure |
| Frontend feature / Dashboards | `frontend/AGENTS.md` |
| DB schema change (Hybrid tables) | `docs/schema.dbml` or equivalent |
| Deploy / Environment | `docs/rules/infrastructure.md` |


## Response Style & Token Compression (MANDATORY)

* **Terse Output:** Cut all pleasantries, introductions, filler words, and meta-commentary.
* **Direct Signal:** Provide only exact code diffs, direct answers, or high-density bullet points.
* **No Explanation Wrappers:** Do not explain *what* you are going to do before doing it. Execute first, summarize in under 3 bullet points if necessary.
* **Code First:** If a task requires code modification, output the file changes directly without conversational preamble.