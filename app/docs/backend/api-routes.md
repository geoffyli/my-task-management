---
parent: "[[backend-moc]]"
tags:
  - backend
  - api
  - routes
  - reference
related:
  - "[[auth-system]]"
  - "[[types-reference]]"
  - "[[sync-overview]]"
---

# API Routes

All HTTP endpoints served by the Hono backend.

**Source:** `server/api/index.ts`

## Authentication

All `/api/*` routes require Bearer token authentication except:
- `POST /api/auth/login` — validates credentials
- `POST /api/webhooks/notion` — uses HMAC verification instead

In development mode (`DEV=true` or `NODE_ENV=development` with no TOKEN set), auth is bypassed. See [[auth-system]] for details.

## Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Returns `{ status: "ok" }` (200) when ready, `{ status: "booting" }` (503) during startup |

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Validate token |

**Request body:**
```json
{ "token": "your-secret-token" }
```

**Responses:**
- `200`: `{ "ok": true }`
- `401`: `{ "error": "Invalid token" }`
- `500`: `{ "error": "No token configured" }` (non-dev, no TOKEN set)

## Data Endpoints

| Method | Path | Auth | Response Type | Description |
|--------|------|------|---------------|-------------|
| GET | `/api/tasks` | Bearer | `Task[]` | All active tasks |
| GET | `/api/projects` | Bearer | `Project[]` | All active projects |
| GET | `/api/areas` | Bearer | `Area[]` | All active areas |
| GET | `/api/status` | Bearer | `SyncStatus` | Last sync times, page counts, event total |
| GET | `/api/events` | Bearer | `SyncEvent[]` | Paginated sync event log |
| POST | `/api/sync` | Bearer | `{ success, message }` | Trigger manual full sync |
| GET | `/api/webhook-status` | Bearer | `WebhookStatus` | Webhook URL and verification state |

### Query Parameters

**`GET /api/events`:**
- `limit` — Number of events to return (default: 50)
- `offset` — Pagination offset (default: 0)

## Sync Endpoint

**`POST /api/sync`** triggers a full re-sync of all Notion databases.

- **Success:** `{ "success": true, "message": "Full sync completed" }` (200)
- **Failure:** `{ "success": false, "message": "<error>" }` (500) — error is also logged to `sync_events`

## Task Network (SSE)

| Method | Path | Auth | Response Type | Description |
|--------|------|------|---------------|-------------|
| GET | `/api/tasks/:id/network` | Bearer | `text/event-stream` | Stream task relationship graph |

**Source:** `server/api/network.ts`, `server/api/network-graph.ts`

Traverses the full connected component of a task's relationships by fetching live from the Notion API (not from SQLite cache). Returns results as Server-Sent Events, one event per BFS level.

### SSE Event Format

```
event: level
data: {"nodes":[...],"edges":[...],"level":0}

event: done
data: {}
```

### Events

| Event | Description |
|-------|-------------|
| `level` | One BFS level discovered — contains new nodes and edges |
| `done` | Traversal complete, stream ends |
| `error` | Error occurred, contains `{ error: string }` |

### Implementation

- BFS starting from `:id`, following "Depends on", "Prepares for", and "Related Tasks" relations
- Max 3 concurrent Notion API fetches per batch with 350ms inter-batch delay
- Uses `fetchWithRetry` from `notion-client.ts` for rate-limit handling
- Uses Hono `streamSSE` helper for event formatting

See [[task-network]] for full feature documentation.

## Webhook Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhooks/notion` | HMAC | Receive Notion webhook events |

This endpoint handles:
1. **Verification handshake** — Notion sends `{ verification_token }`, stored in `sync_meta`
2. **Event processing** — Page create/update/delete/undelete events

See [[webhook-handler]] for detailed implementation.

## Static Asset Serving

In production (when `dist/` exists):
- `GET /assets/*` — Serves compiled frontend bundles
- `GET *` — Catch-all returns `index.html` for SPA client-side routing

## Error Responses

All error responses follow the pattern:
```json
{ "error": "Human-readable message" }
```

Common status codes:
- `401` — Missing or invalid Bearer token
- `500` — Server error (sync failure, missing config)
- `503` — Service unavailable (still booting)
