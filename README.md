# IoT App

Industrial IoT platform built with NestJS and ThingsBoard. Flexible client-based hierarchies, dynamic intermediate asset modeling, an advanced data classifier, customizable alarms, and a scalable multi-dashboard frontend.

Proof of concept: ThingsBoard as the IoT data engine, with a frontend far more capable and flexible than its native UI. See [VISION.md](VISION.md) for the full product goal.

## Stack

| Layer | Technology |
| :--- | :--- |
| Backend | NestJS + Fastify, Prisma (PostgreSQL), Redis |
| IoT Engine | ThingsBoard Cloud / Docker |
| Frontend | Next.js (App Router) + TypeScript, Zustand, TanStack Query |
| Package Manager | npm workspaces |

See `.paul/PROJECT.md` for the authoritative stack table and rationale.

## Layout

```
iot_app/
├── backend/    # NestJS backend
├── frontend/   # Next.js frontend
├── .paul/      # PAUL: PROJECT/ROADMAP/STATE, phases, architecture, domain rules
└── docs/       # ADRs, changelog, historical intake docs
```

## Docs

- [AGENTS.md](AGENTS.md) — how to work in this repo, PAUL workflow
- [VISION.md](VISION.md) — product vision, business domain, scope
- [.paul/PROJECT.md](.paul/PROJECT.md) — current requirements, decisions, stack (source of truth)
- [.paul/ARCHITECTURE.md](.paul/ARCHITECTURE.md) — system design & ADR index
- [.paul/STATE.md](.paul/STATE.md) — living state (position, decisions, blockers)

## Getting started

Not runnable yet — backend and frontend are scaffolding-only. See `.paul/rules/infrastructure.md` once set up.

## Repo commands

TODO: repo commands go here once defined.
