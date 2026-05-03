---
parent: "[[Index]]"
tags: []
related:
  - "[[Architecture]]"
  - "[[Getting Started]]"
---

# Tech Stack

Unified technology reference for the monorepo.

## App Runtime

| Technology | Version | Role |
|-----------|---------|------|
| Bun | Latest | JavaScript runtime, package manager, test runner |
| Hono | 4.x | HTTP framework (API routes + static serving) |
| SQLite | bun:sqlite | Embedded database (WAL mode) |

## App Frontend

| Technology | Version | Role |
|-----------|---------|------|
| React | 19 | UI framework |
| React Router | 7 | Client-side routing |
| Vite | 8 | Build tool and dev server |
| Tailwind CSS | 4 | Utility-first styling |
| Recharts | 3 | Data visualisation / charting |
| React Query (TanStack) | 5 | Server state management and caching |

## App Auth

| Technology | Role |
|-----------|------|
| Single `TOKEN` env var | Shared secret for Bearer token auth |
| Hono middleware | Validates `Authorization: Bearer <TOKEN>` on protected routes |

## Automation Runtime

| Technology | Version | Role |
|-----------|---------|------|
| Windmill CE | Latest | Workflow orchestration platform |
| Bun | Latest | Script execution runtime (within Windmill workers) |

## Automation Dependencies

| Package | Version | Role |
|---------|---------|------|
| @notionhq/client | 5.x | Notion API SDK |
| cron-parser | 5.x | Cron expression parsing for scheduling logic |
| windmill-client | Latest | Windmill internal SDK (state, resources) |

## CLI Tools

| Tool | Role |
|------|------|
| `wmill` | Windmill CLI — sync scripts, manage workspace |
| `gh` | GitHub CLI — PRs, issues, releases |

## Deployment

| Technology | Role |
|-----------|------|
| Docker | Multi-stage build (oven/bun:1 builder → oven/bun:1-slim runtime) |
| Railway | Hosting platform (auto-deploy from main branch) |

## Notion API

| Detail | Value |
|--------|-------|
| API Version | 2025-09-03 |
| Integration Type | Internal |
| Data Sources | Tasks database, Projects database, Areas database |
