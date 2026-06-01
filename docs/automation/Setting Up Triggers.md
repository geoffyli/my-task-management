---
parent: "[[Automation]]"
tags:
related:
  - "[[Creating a Script]]"
  - "[[Deploying Changes]]"
---

# Setting Up Triggers

Triggers make scripts run automatically in response to time-based schedules or external events. This document covers creating schedules and HTTP triggers, which are the two types used by the scripts in this repo.

## Trigger Types

| Type | File Pattern | Use Case | Example in This Repo |
|------|-------------|----------|---------------------|
| Schedule | `.schedule.yaml` | Recurring tasks | [[Create Repetitive Tasks]], [[Create Weekly Note]], [[Update Legacy Tasks]] |
| HTTP | `.http_trigger.yaml` | Incoming webhooks | [[Tasks Webhook Router]] |

## Creating a Schedule

Create a `.schedule.yaml` file in `automation/f/notion_tasks/`.

**Important:** Windmill uses 6-field cron expressions with seconds as the first field.

Format: `seconds minutes hours day-of-month month day-of-week`

### Example: Daily at Midnight CST

```yaml
summary: My script - daily midnight CST
args:
  notion: $res:f/notion_tasks/notion_api
  database_id: <your-database-id>
cron_version: v2
email: geoff.yulong.li@gmail.com
enabled: true
is_flow: false
no_flow_overlap: true
schedule: 0 0 0 * * *
script_path: f/notion_tasks/my_script
timezone: Asia/Shanghai
ws_error_handler_muted: false
```

### Example: Every Monday at Midnight CST

```yaml
schedule: 0 0 0 * * 1
timezone: Asia/Shanghai
script_path: f/notion_tasks/my_weekly_script
```

### Common Cron Patterns (6-Field)

| Pattern | Meaning |
|---------|---------|
| `0 0 0 * * *` | Daily at midnight |
| `0 0 9 * * *` | Daily at 9 AM |
| `0 0 0 * * 1` | Every Monday at midnight |
| `0 0 9 * * 1-5` | Weekdays at 9 AM |
| `0 */5 * * * *` | Every 5 minutes |

### Key Fields

- **`schedule`** — 6-field cron expression (seconds first).
- **`timezone`** — IANA timezone string. All scripts in this repo use `Asia/Shanghai`.
- **`script_path`** — path to the script (without file extension).
- **`args`** — arguments passed to the script on each run. Use `$res:<path>` for resources.
- **`no_flow_overlap`** — prevents concurrent runs of the same schedule.
- **`enabled`** — set to `false` to pause without deleting.

## Creating an HTTP Trigger

Create a `.http_trigger.yaml` file to receive webhooks from external services.

### Example: Notion Webhook Endpoint

```yaml
summary: Notion webhook - tasks webhook router
script_path: f/notion_tasks/tasks_webhook_router
permissioned_as: u/geoffyulongli
is_flow: false
route_path: notion/webhook/tasks
http_method: post
authentication_method: none
request_type: sync
is_static_website: false
workspaced_route: false
wrap_body: false
raw_string: false
```

The endpoint URL will be:

```
https://windmill-production-8a72.up.railway.app/api/r/notion/webhook/tasks
```

### Authentication Options

| Method | Description |
|--------|-------------|
| none | Open access (used for Notion webhooks with custom validation) |
| api_key | Require API key in header |
| signature | HMAC signature verification |
| custom_script | Custom auth logic via preprocessor |

### Sync vs Async

- **`request_type: sync`** — response waits for the script to finish. Required when the caller expects a response body (e.g., Notion verification handshake).
- **`request_type: async`** — response returns immediately with a job ID. Better for long-running tasks.

### Preprocessor Functions

HTTP triggers can use a `preprocessor` function (exported alongside `main`) to filter and transform incoming requests before the main logic runs. The [[Tasks Webhook Router]] script uses this to:

- Handle Notion webhook verification handshakes
- Filter out irrelevant event types
- Validate the event targets the correct database

## Deploying Triggers

Deploy trigger files the same way as scripts:

```bash
cd automation
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push
```

Trigger changes require explicit approval before wrapper execution.

## Managing Schedules

Enable or disable without redeploying:

```bash
wmill schedule enable f/notion_tasks/my_script_schedule
wmill schedule disable f/notion_tasks/my_script_schedule
```
