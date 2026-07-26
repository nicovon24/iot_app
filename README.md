# IoT App

Industrial IoT platform built with NestJS and ThingsBoard. Flexible client-based hierarchies, dynamic intermediate asset modeling, an advanced data classifier, customizable alarms, and a scalable multi-dashboard frontend.

Proof of concept: ThingsBoard as the IoT data engine, with a frontend far more capable and flexible than its native UI. See [VISION.md](VISION.md) for the full product goal.

## Stack

| Layer | Technology |
| :--- | :--- |
| Backend | NestJS + Fastify, Prisma (PostgreSQL), Redis |
| IoT Engine | ThingsBoard Cloud / Docker |
| Frontend | React + TypeScript, Zustand, TanStack Query, TailwindCSS |
| Package Manager | pnpm |

## Layout

```
iot_app/
├── backend/    # NestJS backend
├── frontend/   # React frontend
└── docs/       # Rules, ADRs, agent role definitions, project intake docs
```

## Docs

- [AGENTS.md](AGENTS.md) — context, agent roles, workflow rules (AI + human contributors)
- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture & ADR index
- [CURRENT.md](CURRENT.md) — living state (now / next / blocked / shipped)

## Getting started

Not runnable yet — backend and frontend are scaffolding-only. See `docs/rules/infrastructure.md` once set up.

## Repo commands

TODO: repo commands go here once defined.
