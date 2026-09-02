# Contributing

## Setup

See [README.md](README.md#getting-started) (local) or [README.md](README.md#docker) (Docker).

Node version is pinned in [.nvmrc](.nvmrc) (`nvm use`).

## Before opening a PR

```bash
npm run lint        # eslint, both workspaces
npm run typecheck   # tsc --noEmit, both workspaces
npm run test         # jest (backend) + vitest (frontend)
npm run format:check
```

These also run in CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) and as a pre-commit hook (Husky + lint-staged — runs eslint/prettier on staged files, plus a full typecheck when `.ts`/`.tsx` files are staged).

## Tests

- **Backend** — Jest, co-located `*.spec.ts` next to the code they test (`backend/jest.config.js`). Started with the security guards (`backend/src/common/guards/*.spec.ts`) — highest risk, proven bug history (see `.paul/STATE.md`'s guard-ordering and hierarchy-walk findings).
- **Frontend** — Vitest, co-located `*.test.ts` (`frontend/vitest.config.mts`). Currently pure-logic unit tests only (formatting, unit conversion, chart data pairing/windowing, theme contrast) — no component/hook tests yet.
- **Not yet covered**: `ThingsboardClientService`, business services (`DashboardsService`, etc.), React components/hooks, and end-to-end flows (Playwright is planned but not installed — see `.paul/phases/13-testing-harness/`).
- No coverage threshold is enforced — this is a solo/small-team project, prioritize security-critical and previously-buggy logic over chasing a percentage.

## Style

- Formatting is enforced by Prettier (`npm run format` to fix).
- Lint rules live in `backend/eslint.config.mjs` and `frontend/eslint.config.mjs`.
- Where a lint rule is deliberately suppressed (`eslint-disable-next-line`), leave a comment explaining why — reviewers and future you need the reason, not just the override.

## Commits & branches

- Branch off `main`, PR back into `main`.
- No enforced commit message format; keep them descriptive.

## Docs to know about

- [AGENTS.md](AGENTS.md) — how to work in this repo, PAUL workflow
- [.paul/PROJECT.md](.paul/PROJECT.md) — current requirements, decisions, stack
- [.paul/STATE.md](.paul/STATE.md) — living state (position, decisions, blockers)
