# IoT App Frontend

Next.js (App Router) + TypeScript dashboard for the IoT App backend. Consumes the NestJS API and its WebSocket gateway to browse clients, assets, devices, telemetry, alarms, and users.

## Tech Stack

- **Next.js** 15 (App Router), **React**, **TypeScript**
- **Zustand** for client state
- **TanStack Query** for server state / caching
- **TailwindCSS** for styling
- Native `WebSocket` client for live telemetry ([src/lib/api/ws-client.ts](src/lib/api/ws-client.ts))

## Structure

```
src/
├── app/            # App Router routes: login, dashboard, clients, assets, devices,
│                   # entities, alarms, map, users, admin
├── components/     # Shared UI components
├── widgets/        # Dashboard widgets
├── hooks/          # React hooks
├── lib/api/        # api-client.ts (REST) and ws-client.ts (WebSocket)
├── store/          # Zustand stores
└── types/          # Shared TypeScript types
```

## Environment Variables

Both are **build-time** values — Next.js inlines `NEXT_PUBLIC_*` vars into the JS bundle when you run `next build` (or start the dev server). Changing them after a build (e.g. via a running container's env) has no effect; you must rebuild.

| Variable                   | Default                 | Description                                                |
| -------------------------- | ----------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001` | Backend REST base URL, reachable from the **browser**      |
| `NEXT_PUBLIC_WS_BASE_URL`  | `ws://localhost:3001`   | Backend WebSocket base URL, reachable from the **browser** |

Set them in `frontend/.env.local` for local dev, or as Docker build args (see root [README.md](../README.md#docker)) when building the image. In Docker they must be a host/port the browser can reach (e.g. `localhost:3001` if the backend port is published) — never the internal Docker service name (`http://backend:3001`), since the browser runs outside the compose network.

## Getting Started

```bash
cp .env.example .env.local   # optional, defaults already point at localhost:3001
npm install
npm run dev      # http://localhost:3000, Turbopack

npm run build     # production build
npm run start     # run the production build

npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # vitest
```

## Related Docs

- Root [README.md](../README.md)
- [AGENTS.md](AGENTS.md) — conventions for this package
