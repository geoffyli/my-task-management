---
parent: "[[Index]]"
tags: []
related:
  - "[[Architecture]]"
  - "[[Tech Stack]]"
---

# Getting Started

Developer onboarding guide for the my-task-management monorepo.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Bun | Latest | App runtime, package manager, test runner |
| Node.js | v20+ | Required for `wmill` CLI only |
| Git | Latest | Version control |

## Clone the Repository

```bash
git clone git@github.com:geoffyli/my-task-management.git
cd my-task-management
```

## Web App Development

```bash
cd app
bun install
bun run dev
```

This starts:
- **API server** on `http://localhost:3456`
- **Vite dev server** on `http://localhost:5173` (with HMR, proxies API calls)

The app will attempt a full Notion sync on boot, so ensure `NOTION_API_KEY` is set (see below).

## Automation Development

Install the Windmill CLI globally:

```bash
npm i -g windmill-cli
```

The workspace is already configured in `automation/wmill.yaml`. To pull the latest remote state:

```bash
cd automation
wmill sync pull
```

To push local changes to the Windmill instance:

```bash
wmill sync push --yes
```

## Environment Variables

### App (`app/.env`)

| Variable | Description |
|----------|-------------|
| `NOTION_API_KEY` | Notion integration token (internal integration) |
| `TOKEN` | Bearer token for API authentication |
| `PORT` | Server port (default: 3456) |
| `DB_PATH` | SQLite database path (default: `./data/analytics.db`) |

### Automation

Automation scripts read secrets from Windmill's resource system — no local `.env` needed for script execution. The `wmill` CLI authenticates via workspace token (configured on first use).

## Next Steps

- [[Environment Variables]] — Full reference for all env vars
- [[Deploying Changes]] — How to ship to production
- [[CLI Reference]] — Useful commands for daily development
