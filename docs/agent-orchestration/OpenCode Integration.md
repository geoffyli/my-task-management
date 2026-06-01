---
parent: "[[Agent Orchestration]]"
tags:
related:
  - "[[Dispatch Agent Task]]"
  - "[[Poll Agent Sessions]]"
---

# OpenCode Integration

API surface, cloud worker configuration, skills, MCP servers, session URL
format, model configuration, and known limitations for the OpenCode server used
by the agent orchestration system.

## Server

| Attribute | Value |
|-----------|-------|
| **URL** | `https://opencode-production-4c1e.up.railway.app` |
| **Version** | Docker image installs `opencode-ai@latest` |
| **Auth** | HTTP Basic Auth (`opencode` / password from Windmill resource) |
| **Deployment** | Railway service sourced from `geoffyli/my-harness` |
| **Persistent volume** | Mounted at `/root` for OpenCode auth, state, cache, and global config |

## Cloud Harness Source

The production worker is configured from the `my-harness` repo, not from this
repo:

| Area                | Source                                                |
| ------------------- | ----------------------------------------------------- |
| Cloud profile       | `/Users/geoffyli/Projects/my-harness/cloud/opencode/` |
| Railway config file | `cloud/opencode/railway.json`                         |
| Dockerfile path     | `cloud/opencode/Dockerfile`                           |
| Start command       | `/app/cloud/opencode/scripts/start`                   |
| Health check path   | `/healthz`                                            |

Railway should use the repository root as the build context. Do not set the
Railway root directory to `/cloud/opencode`, because the build needs access to
curated shared skills under `shared/skills/`.

## Runtime Configuration

`cloud/opencode/scripts/build-bundle` creates a runtime bundle at:

```text
/app/cloud/opencode/runtime
```

On container start, `cloud/opencode/scripts/start` installs the bundle into
OpenCode's global config location:

```text
/root/.config/opencode
├── AGENTS.md
├── opencode.jsonc
└── skills/
```

The start script unsets `OPENCODE_CONFIG`, `OPENCODE_CONFIG_DIR`, and
`XDG_CONFIG_HOME` before launching OpenCode. This makes the hosted process use
normal global config discovery, while the `/root` Railway volume preserves
OpenCode auth and state.

Current OpenCode config:

- Source file: `my-harness/cloud/opencode/opencode.jsonc`
- Active global file: `/root/.config/opencode/opencode.jsonc`
- Default agent: `task-worker`
- Model: `openai/gpt-5.4`
- Web tools: `websearch`, `webfetch`
- Notion and GitHub MCP tool prefixes: `notion_`, `github_`
- Interactive browser automation: not configured in v1

## Skills

The cloud worker loads a curated skill bundle, not the full local harness skill
set. Current v1 skills:

- `notion`
- `code-review`
- `writing-notes`

To change cloud skills, update the `SKILLS` array in
`my-harness/cloud/opencode/scripts/build-bundle`, add matching Railway
`watchPatterns` when needed, and deploy the OpenCode Railway service.

## MCP Servers

The active MCP servers are configured globally in
`my-harness/cloud/opencode/opencode.jsonc`:

| Server | Command | Required Railway variable | Tool prefix |
|--------|---------|---------------------------|-------------|
| `notion` | `npx -y @notionhq/notion-mcp-server` | `NOTION_TOKEN` | `notion_` |
| `github` | `npx -y @modelcontextprotocol/server-github` | `GITHUB_PERSONAL_ACCESS_TOKEN` | `github_` |

The OpenCode web UI can show no MCP servers even when the backend has connected
them. Treat `/mcp`, Railway logs, and actual tool availability inside a session
as the source of truth.

## Health And Runtime Checks

Railway health checks use:

```text
GET /healthz
```

`/healthz` is served by the lightweight health proxy in
`serve-with-health-proxy.mjs`. It checks OpenCode's authenticated
`/global/health` endpoint internally.

Operational checks:

- `GET /healthz` should return 200 without Basic Auth.
- `GET /session/status` should return 200 with Basic Auth.
- `GET /mcp` should show `notion` and `github` connected with Basic Auth.

## API Endpoints Used

### Create Session

```http
POST /session
Content-Type: application/json
Authorization: Basic {credentials}

{ "title": "{taskName}", "model": { "id": "gpt-5.4", "providerID": "openai" } }
```

**Response quirk:** The endpoint returns valid JSON immediately followed by the
full SPA HTML in the same response body. The JSON must be sliced out before
parsing:

```typescript
const idx = body.indexOf("<!doctype");
const session = JSON.parse(body.slice(0, idx > 0 ? idx : undefined));
```

**Fields used from response:** `session.id` (session ID), `session.slug` (not
used — see Session URL Format below).

### Send Message (Prompt Delivery)

```http
POST /session/{sessionId}/message
Content-Type: application/json
Authorization: Basic {credentials}

{ "parts": [{ "type": "text", "text": "{prompt}" }] }
```

This is the legacy V1 message endpoint. It triggers the agent to start executing
immediately and returns the created user message object.

### Session Status Map

```http
GET /session/status
Authorization: Basic {credentials}
```

Returns a map of currently active sessions only:

```json
{ "ses_abc123": { "type": "idle | busy | retry" } }
```

Sessions absent from the map have either finished and been evicted, or were
never started.

### Session Lookup

```http
GET /session/{sessionId}
Authorization: Basic {credentials}
```

Returns the full session object (200) or 404 if the session does not exist.
Used by the poller to distinguish "finished and evicted" from "never created."

## Session URL Format

The browser URL for a session is:

```text
{base_url}/Lw/session/{sessionId}
```

**Why not `/s/{slug}`?** The `/s/{slug}` path is a browser-side route that the
SPA resolves by looking up the slug. Slugs are not permanent identifiers — they
can be reassigned to different sessions over time. Navigating to `/s/{slug}`
may open the wrong session. The `/Lw/session/{id}` path navigates directly by
session ID and is always correct.

## Model Configuration

```typescript
const OPENCODE_MODEL = { id: "gpt-5.4", providerID: "openai" };
```

This selects GPT-5.4 from the OpenAI provider configured in the OpenCode server.
OpenAI/ChatGPT authentication is maintained by the OpenCode instance and
persisted on the `/root` Railway volume.

## Known Limitations

### V2 Prompt API — Permanently Stubbed

`POST /api/session/{id}/prompt` returns `503 Service Unavailable` with message
`"V2 session prompt is not available yet"`. This is intentional in the current
server: the V2 API layer is scaffolded but mutations are not yet implemented.

**Workaround:** Use `POST /session/{id}/message` (V1 legacy endpoint), which is
fully implemented and triggers agent execution.

### Session Response Contains HTML

`POST /session` returns JSON + HTML in a single response body. This is a
server-side rendering artifact — the endpoint serves both the API JSON and
bootstraps the SPA in one response. Always parse only the JSON prefix.

### Web UI MCP List Can Be Misleading

The web UI can show no configured MCP servers even when the backend MCP servers
are connected and usable. Verify MCP status through `/mcp`, Railway logs, and a
fresh agent session.

## Windmill Resource

OpenCode credentials are stored as a Windmill resource of custom type
`opencode_server`:

```text
Resource path: f/notion_tasks/opencode_api
Type: opencode_server

Fields:
  base_url: https://opencode-production-4c1e.up.railway.app
  username: opencode
  password: {secret}
```

The custom resource type `opencode_server` was created in the Windmill workspace
to allow type-safe resource access. Do not use the generic `object` type — it
causes "Resource not found" errors at runtime.
