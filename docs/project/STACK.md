# STACK.md

## Backend

- **Framework**: NestJS + Fastify adapter (`@nestjs/platform-fastify`)
- **Auth**: custom guard that logs in against ThingsBoard and caches the JWT in Redis
- **ORM**: Prisma (PostgreSQL)
- **Cache**: Redis (ThingsBoard JWT + telemetry aggregation results)
- **WebSockets**: `@nestjs/platform-ws` (real-time telemetry and alarms)
- **API**: REST (GraphQL was discarded) + Swagger/OpenAPI via `@fastify/swagger` (single source of API docs — Bruno dropped, redundant with Swagger)
- **Validation**: class-validator + class-transformer
- **Rate limiting**: `@nestjs/throttler` on the login endpoint only (brute-force protection), not applied globally
- **Deploy**: Supabase (DB), Render (API), Vercel

## Frontend

- **Base**: React + Zustand (UI/client state: selection, filters, layout)
- **Server state**: TanStack Query (telemetry, listings, polling)
- **Dashboards**: react-grid-layout (widgets the user can arrange/pin)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Testing

- **Unit**: Jest (built into Nest by default — `@nestjs/testing` for mocking providers/guards)
- **E2E**: Playwright
  - Against the API (supertest-style) for backend flows
  - Against the frontend for full user flows (login → dashboard → pin widget)
- For auth guard integration tests: real Redis via `docker-compose.test.yml` (avoid mocking it entirely — catches TTL/serialization bugs)

## Git Hooks (local)

- **Husky** + **lint-staged** — status: installed, rules pending scaffold
  - Root `package.json` (npm workspaces: `backend`, `frontend`) has `husky` + `lint-staged` as devDeps, `prepare` script runs `husky`
  - `.husky/pre-commit` → `npx lint-staged`
  - `lint-staged` config (root `package.json`) filtered by workspace:
    - `backend/**/*.{ts,js}` → `eslint --fix`, `prettier --write`
    - `frontend/**/*.{ts,tsx,js,jsx}` → `eslint --fix`, `prettier --write`
  - `pre-push`: fast unit tests (Jest) — **not added yet**, no `test` script exists until Nest backend is scaffolded (Stage 1)
  - When backend/frontend get their own `package.json` + eslint/prettier configs (Stage 1), lint-staged rules start actually running instead of no-op
  - Add `.husky/pre-push` running `npm run test --workspaces --if-present` once Jest is wired in backend

## CI/CD

- **CI**: GitHub Actions (Jenkins was ruled out — no infra to maintain, direct integration with the repo and with Render/Vercel)
  - Pipeline: lint → unit tests → build → e2e (Playwright) on PRs to `main`
  - Branch protection: merge is blocked if the pipeline fails
- **CD**: automatic deploy from `main` via Render and Vercel's native webhooks/integration (or as the final step of the same Actions workflow)

## Infra

- Docker / docker-compose (local environment + `docker-compose.test.yml` for integration)
- Multi-stage Dockerfile for the API (deps → build → runtime with only `dist` + production `node_modules`) for deploying on Render
- ThingsBoard as the IoT engine (devices, assets, telemetry, rule engine)

---

## Editor / Agent

- Claude Code (VS Code, via Anthropic's official extension — or directly in the terminal)
- **Scope policy for this repo**: everything below (framework, plugins, skills, MCPs) is installed at **project/local scope**, not global — keeps it isolated from other side projects (electoral platform, Prodeazo, Scout Panel, etc.)

## Development Framework: PAUL

Plan → Apply → Unify loop. Replaces the earlier GSD evaluation — lighter on tokens for a solo-dev project of this size (no parallel subagent orchestration overhead).

**Install (local, this repo only):**
```bash
npx paul-framework --local
```

**Core commands:**
```
/paul:init      # builds PROJECT.md from requirements
/paul:plan      # creates a plan, auto-detects scope (quick-fix / standard / complex)
/paul:apply     # executes the approved plan, task by task with verification
/paul:unify     # closes the loop — required; reconciles planned vs. actual, updates STATE.md
/paul:progress  # check status anytime
/paul:help      # confirm install
```

## Claude Code Plugins

| Plugin | Install | What it does |
|---|---|---|
| ponytail | `/plugin marketplace add DietrichGebert/ponytail`<br>`/plugin install ponytail@ponytail` | Minimizes the code the agent writes (YAGNI ladder) |
| caveman | `claude plugin marketplace add JuliusBrussee/caveman`<br>`claude plugin install caveman@caveman` | Compresses the agent's prose (~65% fewer output tokens) |
| supermemory | `/plugin marketplace add supermemoryai/claude-supermemory`<br>`/plugin install supermemory --scope local` | Persistent memory across sessions — remembers project conventions, decisions, entity model (tenant→client→location→area→asset→sensor) without re-explaining every session. **Self-hosted preferred** given the project handles real client/industry data (see MCP section below) |

*Cursor equivalent (rules only, no dynamic commands): `.cursor/rules/` — copy from each repo, or `npx skills add JuliusBrussee/caveman -a cursor`*

## Skills

| Skill | Install | What it does |
|---|---|---|
| architecture-decision-records | `npx skills add affaan-m/everything-claude-code --skill architecture-decision-records --agent claude-code` | Detects architectural decisions during the session and writes them as structured ADR docs in `docs/adr/`. Session-level, on-demand — complements (doesn't replace) the `adr-analysis` MCP below, which does static codebase scanning |

## MCP Servers

```json
{
  "mcpServers": {
    "thingsboard": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "THINGSBOARD_URL", "-e", "THINGSBOARD_API_KEY", "thingsboard/mcp"],
      "env": {
        "THINGSBOARD_URL": "https://thingsboard.cloud",
        "THINGSBOARD_API_KEY": "${THINGSBOARD_API_KEY}"
      }
    },
    "markitdown": {
      "command": "npx",
      "args": ["-y", "@microsoft/markitdown-mcp"]
    },
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/your/project",
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
        "AI_MODEL": "anthropic/claude-3-haiku"
      }
    },
    "supermemory": {
      "url": "http://localhost:6767/mcp"
    }
  }
}
```

- **thingsboard** (`thingsboard/mcp`, official image): query devices, assets, telemetry, alarms in natural language
- **markitdown**: converts PDFs and other formats to clean Markdown before the agent processes them (saves reading tokens)
- **adr-analysis**: scans the code (Tree-sitter, local, no token cost) and suggests/generates Architecture Decision Records on demand — `EXECUTION_MODE=full` only when actually generating an ADR, not as the default
- **supermemory**: self-hosted (`npx supermemory local` → runs `supermemory-server` on `localhost:6767`) — keeps memory data on-machine instead of sending project context to a third-party server. `/context` in-session pulls the current profile into the conversation

**Postgres MCP** (recommended addition, config not yet defined):
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/yourdb"]
}
```

**Note on token overhead**: each active MCP server adds its tool definitions to every turn. With `thingsboard` + `markitdown` + `adr-analysis` + `supermemory` (and `postgres` pending), worth periodically checking `/context` and disconnecting servers not in active use that session — particularly relevant on the Pro plan, where session budget is tighter than on Max.