---
parent: "[[operations-moc]]"
tags:
  - operations
  - docker
  - deployment
related:
  - "[[environment-variables]]"
  - "[[getting-started]]"
---

# Docker Deployment

Single-container deployment serving both the compiled frontend and the API.

**Source:** `Dockerfile`

## Architecture

One Bun process handles everything:
- Serves static frontend from `dist/` directory
- Runs the Hono API server
- Manages the SQLite database in `/app/data/`
- Executes sync operations (full sync, reconciliation, webhooks)

## Multi-Stage Build

### Stage 1: Builder (`oven/bun:1`)

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
```

- Installs all dependencies (including devDependencies for building)
- Runs `vite build` to compile the React frontend into `dist/`

### Stage 2: Runtime (`oven/bun:1-slim`)

```dockerfile
FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/api/types.ts ./src/api/types.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p /app/data
```

Copies only what's needed:
- `dist/` — Compiled frontend (static HTML/JS/CSS)
- `server/` — Backend source (runs directly via Bun)
- `src/api/types.ts` — Shared type definitions imported by server
- `node_modules/` — Runtime dependencies (hono, etc.)
- `package.json` — Module resolution

## Container Configuration

```dockerfile
ENV PORT=3456
ENV DB_PATH=/app/data/analytics.db
EXPOSE 3456
CMD ["bun", "run", "server/index.ts"]
```

## Running

### Build

```bash
docker build -t task-analytics .
```

### Run

```bash
docker run -d \
  -p 3456:3456 \
  -v /path/to/data:/app/data \
  -e NOTION_API_KEY=ntn_xxxxx \
  -e TOKEN=your-secret-token \
  task-analytics
```

### Required Runtime Environment Variables

- `NOTION_API_KEY` — Required for Notion sync
- `TOKEN` — Required for API authentication

See [[environment-variables]] for complete reference.

## Data Persistence

The SQLite database lives at `/app/data/analytics.db`. Mount a Docker volume to persist data across container restarts:

```bash
-v /host/path:/app/data
```

Without a volume mount, data is lost when the container is recreated.

## SPA Routing

The server detects the presence of `dist/` and:
1. Serves `/assets/*` as static files (JS, CSS bundles)
2. Returns `index.html` for all other GET requests (client-side routing)

## Health Check

```bash
curl http://localhost:3456/healthz
# { "status": "ok" } when ready
# { "status": "booting" } (HTTP 503) during startup sync
```

Use this for container orchestration health checks and load balancer probes.
