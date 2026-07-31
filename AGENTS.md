# AGENTS.md — IoT Platform

## What This Is

Industrial IoT platform built with NestJS, Next.js, and ThingsBoard. See [VISION.md](VISION.md) for product vision and [.paul/PROJECT.md](.paul/PROJECT.md) for current requirements, decisions, and stack — that file is the source of truth for "what are we building and how", not this one.

## Monorepo Layout

```
iot_app/
├── frontend/             # Next.js frontend
├── backend/              # NestJS backend
├── .paul/                # PAUL: project state, architecture, domain rules, phase plans
│   ├── PROJECT.md         # requirements, decisions, stack — source of truth
│   ├── ROADMAP.md         # milestone/phase structure
│   ├── STATE.md           # living state — position, decisions, blockers, next action
│   ├── ARCHITECTURE.md    # system design & ADR index
│   ├── rules/              # domain rules (api.md, infrastructure.md, testing.md)
│   └── phases/             # per-phase PLAN.md / SUMMARY.md (historical record)
├── docs/                 # ADRs, changelog, historical intake docs (not source of truth)
├── AGENTS.md             # ← you are here — how to work in this repo
└── VISION.md             # product vision, business domain, scope (rarely changes)
```

## What to Read First Per Task

Always start with `.paul/STATE.md` — it tells you exactly where the project is, what was just done, and what's next. Then:

| Task type | Read |
| :--- | :--- |
| Any session | `.paul/STATE.md` → `.paul/PROJECT.md` if you need the "why" |
| Backend feature / NestJS | `.paul/rules/api.md` |
| Deploy / environment | `.paul/rules/infrastructure.md` |
| Testing | `.paul/rules/testing.md` |
| Architecture / entity model / DB design | `.paul/ARCHITECTURE.md` |
| Codebase/architecture question about existing code | `graphify query "<question>"` (see `.claude/skills/graphify/SKILL.md`) |

## The PAUL Workflow (how this project runs)

This is a solo-dev project. Work happens through **PAUL** (`/paul:*` commands), a plan → apply → unify loop sized for one person — no multi-role pipeline, no heavy subagent orchestration.

```
DISCUSS ──▶ PLAN ──▶ APPLY ──▶ UNIFY
 (optional)    │        │         │
               │        │         └─ reconcile plan vs actual, close the loop, update STATE.md
               │        └─ execute the approved plan, commit per task
               └─ produce an approved PLAN.md for the current phase
```

- **`/paul:progress`** — smart status, suggests the one next action. Run this when picking up work or unsure what's next.
- **`/paul:discuss`** — explore/articulate a phase's vision before planning (use for anything non-trivial or ambiguous).
- **`/paul:plan`** — enter PLAN phase for the current or a new plan; produces `.paul/phases/<phase>/<plan>-PLAN.md`.
- **`/paul:apply`** — execute an approved PLAN.
- **`/paul:verify`** — guided manual UAT of what was just built.
- **`/paul:unify`** — reconcile plan vs. actual, close the loop, update `.paul/STATE.md`.
- **`/paul:pause`** / **`/paul:resume`** — handoff across sessions without losing context.
- **`/paul:handoff`** — full session handoff document when needed.
- **`/paul:help`** — full command list.

`.paul/STATE.md` is the living digest (position, decisions, deferred issues, blockers, session continuity) — updated after every significant action. `.paul/ROADMAP.md` holds the milestone/phase breakdown. `.paul/phases/**/PLAN.md` + `SUMMARY.md` are the historical record of what was planned and what actually shipped — don't rewrite them after the fact.

## Git Workflow

- Never commit or push until the user explicitly confirms in that turn/session — not even after an approved plan or a finished task. Implementation approval is not commit approval.
- After finishing an implementation, report what changed and wait for the user's go-ahead before running any `git commit` or `git push`. Applies to all branches and all tasks, no exceptions.

## Key Invariants

- **Never duplicate ThingsBoard entities:** Tenants, Customers (Clients), Assets, Devices, Users, Telemetry, and Attributes live in ThingsBoard and are queried via its API. Do not create local database tables for them.
- **Flexible Hierarchy Rule:** Intermediate levels (Locations, Areas, Sections) are modeled as ThingsBoard Assets with a `hierarchyLevelId` attribute, connected via a single generic relation type (`"Contains"`).
- **Users/roles are TB-native**, not an app-owned table — see `.paul/PROJECT.md` Key Decisions.
- **Code comments language:** strictly English throughout, even though the UI is in Spanish for end users.

## Language

All project documentation, code comments, and commit messages are in **English**. The app UI itself remains in Spanish (targeting end users).

## Knowledge Graph (graphify)

Project has a knowledge graph at `graphify-out/` (god nodes, community structure, cross-file relationships). Run `graphify query "<question>"` first when `graphify-out/graph.json` exists; `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for concepts. Run `graphify update .` after code changes to keep it current.

## Response Style & Token Compression (MANDATORY)

- **Terse output:** cut pleasantries, introductions, filler words, meta-commentary.
- **Direct signal:** exact code diffs, direct answers, high-density bullet points.
- **No explanation wrappers:** don't narrate what you're about to do before doing it. Execute first, summarize in under 3 bullet points if necessary.
- **Code first:** if a task requires code modification, output the file changes directly without conversational preamble.
