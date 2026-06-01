---
parent: "[[Operations]]"
tags: []
related:
  - "[[Architecture]]"
  - "[[Railway Deployment]]"
---

# Windmill Deployment

How the Windmill CE instance is hosted and how scripts are deployed.

## Instance Details

| Setting | Value |
|---------|-------|
| Edition | Windmill Community Edition (CE) |
| Host | Railway |
| URL | https://windmill-production-8a72.up.railway.app/ |
| Workspace | `my-automation` |

## Infrastructure Components

The Windmill instance on Railway consists of:

| Service | Role |
|---------|------|
| PostgreSQL | Windmill metadata store (jobs, schedules, resources) |
| windmill-server | API server and UI |
| windmill-worker | Script execution (Bun runtime) |

## Script Deployment

Scripts are deployed manually from the monorepo:

```bash
cd automation
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push
```

### Sync Scope

The `automation/wmill.yaml` configuration scopes sync to specific folders:

- `f/notion_tasks/**` — Task automation scripts

`f/notion/**` is retired. The Notion API resource for task automation lives at `f/notion_tasks/notion_api`.

### Scripts Managed in This Monorepo

| Script | Trigger | Purpose |
|--------|---------|---------|
| `create_repetitive_tasks` | Cron (daily) | Generate recurring tasks in Notion |
| `create_weekly_note` | Cron (weekly) | Create weekly planning page |
| `tasks_webhook_router` | Webhook | Route task property changes and set lifecycle dates |
| `update_legacy_tasks` | **Disabled** | Formerly rolled overdue tasks forward |

### Scripts Managed Elsewhere

Other scripts in the workspace (e.g., `inbox`, `demo`) are managed from the separate `my-automation` repository and are outside this monorepo's sync scope.

## CE Limitations

| Limitation | Impact |
|-----------|--------|
| 10 users with SSO | Single-developer use — not a constraint |
| No auto-sync | Must use the harness Windmill wrapper after local changes |
| No audit log retention | Rely on git history for change tracking |

## Deployment Workflow

1. Edit scripts locally in `automation/f/`
2. Test via Windmill UI (draft runs) or locally with Bun
3. Run the harness Windmill wrapper in plan-only mode
4. Execute through the wrapper only after the preflight report passes
5. Verify in Windmill UI that scripts and schedules are updated
