---
parent: "[[frontend-moc]]"
tags:
  - frontend
  - api
  - fetch
  - client
related:
  - "[[api-routes]]"
  - "[[types-reference]]"
  - "[[state-management]]"
---

# API Client

The frontend API layer consists of a generic fetch wrapper and typed React Query hooks.

## Fetch Wrapper

**Source:** `src/api/client.ts`

```typescript
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T>
```

- Automatically injects `Authorization: Bearer <token>` header from stored token
- Throws on non-2xx responses with `API error: {status}` message
- Returns parsed JSON response typed as `T`

### `api` Object

Typed methods for each endpoint:

| Method | Endpoint | Return Type |
|--------|----------|-------------|
| `api.getTasks()` | GET /api/tasks | `Task[]` |
| `api.getProjects()` | GET /api/projects | `Project[]` |
| `api.getAreas()` | GET /api/areas | `Area[]` |
| `api.getSyncStatus()` | GET /api/status | `SyncStatus` |
| `api.getSyncEvents(limit, offset)` | GET /api/events | `SyncEvent[]` |
| `api.triggerSync()` | POST /api/sync | `{ success, message }` |
| `api.getWebhookStatus()` | GET /api/webhook-status | `WebhookStatus` |

## React Query Hooks

**Source:** `src/api/queries.ts`

Each API method is wrapped in a `useQuery` hook with appropriate caching configuration.

| Hook | Query Key | Stale Time | Auto-Refetch |
|------|-----------|------------|--------------|
| `useTasks()` | `["tasks"]` | 5 minutes | No |
| `useProjects()` | `["projects"]` | 5 minutes | No |
| `useAreas()` | `["areas"]` | 5 minutes | No |
| `useSyncStatus()` | `["sync", "status"]` | 30 seconds | Every 30s |
| `useSyncEvents(limit, offset)` | `["sync", "events", limit, offset]` | 30 seconds | No |
| `useWebhookStatus()` | `["webhook-status"]` | 30 seconds | Every 30s |

### Caching Strategy

- **Task/project/area data**: 5-minute stale time. These change infrequently and a full page reload or manual sync triggers fresh data.
- **Sync status**: 30-second stale time with 30-second refetch interval. The Settings page needs near-real-time sync state visibility.

## Dev Proxy

In development, Vite proxies all `/api` requests to `http://localhost:3456`:

```typescript
// vite.config.ts
server: {
  proxy: { "/api": "http://localhost:3456" }
}
```

In production, the same Bun process serves both the API and the compiled frontend — no proxy needed.
