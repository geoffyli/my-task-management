---
parent: "[[Operations]]"
tags: []
related:
  - "[[Architecture]]"
  - "[[Windmill Deployment]]"
---

# Railway Deployment

How the web app deploys to Railway from the monorepo.

## Service Configuration

| Setting | Value |
|---------|-------|
| Source repo | `geoffyli/my-task-management` |
| Root directory | `/app` |
| Builder | Dockerfile (explicitly set, not auto-detected) |
| Dockerfile path | `/app/Dockerfile` |
| Branch | `main` (auto-deploy on push) |
| Region | Southeast Asia (Singapore) |

## Docker Build

The app uses a multi-stage Docker build:

1. **Builder stage** (`oven/bun:1`) — installs dependencies, builds the Vite frontend, bundles the server
2. **Runtime stage** (`oven/bun:1-slim`) — copies built artifacts, runs with minimal image size

```dockerfile
# Builder
FROM oven/bun:1 AS builder
# ... install, build

# Runtime
FROM oven/bun:1-slim
# ... copy dist, start
```

## Runtime Configuration

| Setting | Value |
|---------|-------|
| Port | 3456 |
| Database path | `/app/data/analytics.db` |
| Volume | Mounted at `/app/data` for SQLite persistence |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NOTION_API_KEY` | Notion integration token for sync |
| `TOKEN` | Bearer auth token for API access |
| `PORT` | Server listen port (3456) |
| `DB_PATH` | SQLite database file path |

## Deployment Flow

1. Push to `main` branch
2. Railway detects change in `/app` root directory
3. Docker build triggered using `app/Dockerfile`
4. New container deployed with zero-downtime swap
5. App boots, runs full Notion sync, then serves traffic

## Persistence

SQLite requires a persistent volume — without it, the database resets on every deploy. The Railway volume is mounted at `/app/data` to ensure `analytics.db` survives container restarts and redeploys.
