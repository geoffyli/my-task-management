# My Task Management

Monorepo for my personal Notion task management system.

## Structure

- `app/` — Full-stack task analytics dashboard (React + Hono + SQLite)
- `automation/` — Windmill automation scripts for Notion task management

## App

The web dashboard syncs data from Notion (tasks, projects, areas) into a local SQLite database and serves an interactive analytics dashboard.

```bash
cd app
bun install
bun run dev
```

## Automation

Windmill scripts that manage Notion tasks on schedules and webhooks.

```bash
cd automation
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push
```

This repo owns the live Windmill `f/notion_tasks/**` folder. Production sync must use the harness Windmill skill and wrapper, not raw `wmill sync push --yes`.
