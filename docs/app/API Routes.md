---
parent: "[[App]]"
tags:
related:
  - "[[Auth System]]"
  - "[[Types Reference]]"
  - "[[Sync Overview]]"
---

# API Routes

All HTTP endpoints served by the Hono backend.

**Source:** `app/server/api/index.ts`

## Authentication

All `/api/*` routes require Bearer token authentication except:
- `POST /api/auth/login` — validates credentials
- `POST /api/webhooks/notion` — uses HMAC verification instead

In development mode (`DEV=true` or `NODE_ENV=development` with no TOKEN set), auth is bypassed. See [[Auth System]] for details.

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

## Webhook Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/webhooks/notion` | None | Probe endpoint returning `{ reachable, verified, lastWebhook }` |
| POST | `/api/webhooks/notion` | HMAC | Receive Notion webhook events |

This endpoint handles:
1. **Verification handshake** — Notion sends `{ verification_token }`, stored in `sync_meta`
2. **Event processing** — Page create/update/delete/undelete events

See [[Webhook Handler]] for detailed implementation.

## Push Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/push/vapid-key` | Bearer | Get VAPID public key |
| POST | `/api/push/subscribe` | Bearer | Register push subscription |
| DELETE | `/api/push/subscribe` | Bearer | Remove subscription by endpoint |
| GET | `/api/push/devices` | Bearer | List registered devices |
| PATCH | `/api/push/devices/:id` | Bearer | Rename device |
| DELETE | `/api/push/devices/:id` | Bearer | Remove device |
| GET | `/api/push/preferences` | Bearer | Get global + device preferences |
| PUT | `/api/push/preferences` | Bearer | Update global preferences |
| PUT | `/api/push/preferences/:deviceId` | Bearer | Update per-device overrides |
| DELETE | `/api/push/preferences/:deviceId` | Bearer | Remove device overrides |
| POST | `/api/push/test` | Bearer | Send test notification |

See [[Push Notification System]] for architecture details and notification types.

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
