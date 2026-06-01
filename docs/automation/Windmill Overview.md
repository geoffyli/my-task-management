---
parent: "[[Automation]]"
tags:
related:
  - "[[Deploying Changes]]"
  - "[[File Structure]]"
---

# Windmill Overview

[Windmill](https://www.windmill.dev/) is an open-source platform for building and running automation scripts, flows, and scheduled jobs. This project uses Windmill to automate Notion task management operations.

## Architecture

The system runs as three services on Railway:

- **PostgreSQL** (managed by Railway) — stores all persistent state including scripts, job queue, and results.
- **windmill-server** — serves the web UI and REST API. Public URL: `https://windmill-production-8a72.up.railway.app`
- **windmill-worker** — pulls jobs from the PostgreSQL queue and executes them in isolated environments.

### Request Flow

1. A trigger fires (schedule, webhook, or manual run).
2. The server creates a job record in PostgreSQL.
3. A worker picks up the job, executes the script, and writes results back to PostgreSQL.
4. Results are visible in the web UI or retrievable via the API.

## Workspace

The Windmill workspace is `my-automation`. All scripts in this monorepo are scoped to the `f/notion_tasks/` folder within that workspace.

## Sync Model

Windmill Community Edition does not support automatic Git sync. Instead, sync is a manual process guarded by the harness Windmill wrapper.

The workflow:

1. Edit scripts locally in `automation/f/notion_tasks/`.
2. Preview deployment: `cd automation && node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push`
3. Commit to Git for version control.

The `wmill.yaml` in the `automation/` directory is scoped to only sync `f/notion_tasks/**` entities. This repo does not own `f/notion/**`; that folder is retired.

### Pulling Remote Changes

If changes were made directly in the Windmill UI:

```bash
cd automation
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs pull
```

Always pull before pushing to avoid overwriting UI-made changes.

## Community Edition Limits

| Feature | CE Limit |
|---------|----------|
| Users (with SSO) | 10 |
| Users (without SSO) | 50 |
| Workspaces | 3 max |
| Groups | 4 max |
| Job retention | 30 days |
| Git sync | Manual only |
| Audit logs | Not available |

These limits are sufficient for personal use.

## Core Concepts

### Scripts

Single-function automation units. The default runtime is TypeScript on Bun. Each script has a `main` function whose parameters become the input schema automatically.

### Resources

Typed JSON objects that store credentials for external services (e.g., Notion API token). Resources are referenced by path in scripts and resolved at runtime. The Notion resource used by all scripts in this repo is `f/notion_tasks/notion_api`.

### Schedules

Cron-based recurring execution using a 6-field format (seconds, minutes, hours, day-of-month, month, day-of-week). Example: `0 0 0 * * *` runs daily at midnight.

### HTTP Triggers

Event-based execution via custom HTTP endpoints. Used for receiving webhooks from external services like Notion.
