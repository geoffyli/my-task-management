---
parent: "[[Agent Orchestration]]"
tags:
related:
  - "[[Windmill Overview]]"
  - "[[Deploying Changes]]"
---

# Operations

Setup requirements, deployment steps, end-to-end test procedure, and troubleshooting for the agent orchestration system.

## Required Windmill Resources and Variables

### Resources

| Path | Type | Fields |
|------|------|--------|
| `f/notion/api` | (existing) | `token` — Notion integration token |
| `f/notion_tasks/opencode_api` | `opencode_server` (custom type) | `base_url`, `username`, `password` |

The `opencode_server` resource type must be created in the Windmill workspace before creating the resource. Use the Windmill UI: Settings → Resource Types → New.

### Variables

| Path | Description |
|------|-------------|
| `f/notion_tasks/notion_webhook_secret` | HMAC secret from the Notion webhook subscription |

### Notion Webhook URL

The webhook URL must include `raw_string: true` in the Windmill HTTP trigger YAML (already configured). The Notion webhook subscription URL is:

```
https://windmill-production-8a72.up.railway.app/api/r/notion/webhook/tasks
```

## Required OpenCode Railway Configuration

The OpenCode worker is deployed from `geoffyli/my-harness`, not from this
repository.

| Setting | Value |
|---------|-------|
| Railway config file | `/cloud/opencode/railway.json` |
| Dockerfile path | `cloud/opencode/Dockerfile` |
| Build context | Repository root |
| Start command | `/app/cloud/opencode/scripts/start` |
| Health check path | `/healthz` |
| Persistent volume | `/root` |

Required Railway service variables:

| Variable | Purpose |
|----------|---------|
| `OPENCODE_SERVER_PASSWORD` | Basic Auth password |
| `NOTION_TOKEN` | Notion MCP access |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub MCP access |

Do not set Railway's root directory to `/cloud/opencode`; the build needs
`shared/skills/` from the repo root.

## Deploying Changes

From the repo root:

```bash
cd automation
wmill sync push
```

Confirm the changed scripts appear in the Windmill UI before running an end-to-end test.

## End-to-End Test

1. Create or select a task in the Notion Tasks database.
2. Set **Agent** → **Queued**.
3. Within ~10 seconds: check Windmill job history — `tasks_webhook_router` should have fired. Look for `agent_dispatch` in the triggers list and a submitted async job ID.
4. Within ~30 seconds: `dispatch_agent_task` job should appear in Windmill history and complete successfully. Notion task should show:
   - `Agent` → `Running`
   - `Agent Session` URL populated (format: `.../Lw/session/ses_...`)
5. Open the `Agent Session` URL in a browser — the OpenCode session should show the intake prompt and the agent's first response.
6. Wait for the agent to finish. Within 2 minutes of completion: `poll_agent_sessions` sets `Agent` → `Review`.

## OpenCode Verification

Use these checks after deploying the cloud worker:

| Check | Expected result |
|-------|-----------------|
| `GET {base_url}/healthz` | 200 without Basic Auth |
| `GET {base_url}/session/status` | 200 with Basic Auth |
| `GET {base_url}/mcp` | `notion` and `github` connected with Basic Auth |
| Fresh OpenCode session | `notion_` and `github_` tools usable |
| Notion-dispatched smoke task | Agent reads task, works, and writes output back to Notion |

If the OpenCode web UI shows no MCP servers, verify `/mcp` and runtime tool
availability before treating it as a configuration failure.

## Troubleshooting

### Agent stays Queued, no webhook job appears

- Verify the Notion webhook subscription is active and the URL matches the Windmill HTTP trigger route.
- Check that the Notion integration has access to the Tasks database.
- Confirm the `Agent` property ID in the webhook router matches `IMWB` (check via Notion API if unsure).

### Webhook fires but dispatch job is not submitted

- Check `tasks_webhook_router` job logs in Windmill.
- If HMAC verification fails: the webhook secret variable `f/notion_tasks/notion_webhook_secret` may be wrong.
- If `raw_string` is missing from job args: ensure the HTTP trigger YAML has `raw_string: true`.
- If `agent_dispatch` is not in triggers: the `updated_properties` array did not contain `IMWB`. This can happen if Notion sends a different event type — check the raw payload in the job args.

### Dispatch job fails immediately (Resource not found)

- The `f/notion_tasks/opencode_api` resource does not exist or has the wrong type.
- Recreate it using the Windmill UI with type `opencode_server` (not `object`).

### Dispatch job fails with lock key error

- The lock key must have format `f/notion_tasks/dispatch_lock_{pageIdNoHyphens}`.
- Hyphens in the page ID are stripped. The `f/notion_tasks/` prefix is required.

### Session created but Agent Session URL is blank

- Check that the dispatch script completed without error — look for the `[dispatch] Done` log line.
- The `Agent Session` property must be a **URL** type in Notion, not text.

### Agent Session URL opens a blank page or wrong session

- Ensure the URL uses `/Lw/session/{id}` format, not `/s/{slug}`.
- The `/s/{slug}` format is unreliable — slugs are reassigned over time.

### Agent stays Running indefinitely

- Check `poll_agent_sessions` is enabled in Windmill (schedule should be active).
- Check Windmill job history for poller runs — look for `aborted: true` (OpenCode `/session/status` was unreachable).
- Verify OpenCode server is healthy: `GET {base_url}/healthz` should return 200 without Basic Auth.
- Verify OpenCode API access: `GET {base_url}/session/status` should return 200 with Basic Auth.

### Agent transitions to Failed

- Dispatch failure: check `dispatch_agent_task` job logs for the error message.
- Poller failure: session returned 404 from OpenCode, meaning the session was never created or was deleted. Check if OpenCode's persistent volume is functioning.
- An error note is appended to the task page body with the specific session ID.

### MCP servers work but the web UI says none are configured

- This can happen with the current hosted OpenCode UI.
- Check `GET {base_url}/mcp` with Basic Auth.
- Check Railway logs for `service=mcp` startup lines and tool counts.
- Confirm a fresh session can use `notion_` and `github_` tools.
- The active config should be `/root/.config/opencode/opencode.jsonc`.
