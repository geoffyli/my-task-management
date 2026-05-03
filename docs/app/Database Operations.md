---
parent: "[[App]]"
tags:
related:
  - "[[Database Schema]]"
  - "[[Property Mapping]]"
  - "[[Types Reference]]"
---

# Database Operations

The store layer manages all CRUD operations on the SQLite database, including property extraction from raw Notion JSON into typed table rows.

**Source:** `app/server/db/store.ts` (mutations), `app/server/db/queries.ts` (reads), `app/server/db/index.ts` (exports and lifecycle)

## Write Operations

### `upsertPage(db, page: RawPage)`

The central write function. Inserts or replaces a page and its typed row atomically.

```
1. INSERT OR REPLACE into `pages` table (sets deleted_at = NULL to restore if previously deleted)
2. Parse raw_json
3. Switch on database_id:
   - "tasks" -> extractTaskRow() -> INSERT OR REPLACE into tasks
   - "projects" -> extractProjectRow() -> INSERT OR REPLACE into projects
   - "areas" -> extractAreaRow() -> INSERT OR REPLACE into areas
```

**Input type:**
```typescript
interface RawPage {
  id: string;
  database_id: string;    // "tasks" | "projects" | "areas"
  raw_json: string;       // Full Notion page JSON
  last_edited_time: string;
}
```

### `bulkUpsert(db, pages: RawPage[])`

Wraps multiple `upsertPage()` calls in a single SQLite transaction for atomic batch inserts. Used by full sync to ensure all-or-nothing writes.

### `softDeletePage(db, id)`

Sets `deleted_at = datetime('now')` on the page. The typed row remains in place but is excluded from queries (which JOIN on `pages` and filter `deleted_at IS NULL`).

### `restorePage(db, id)`

Clears `deleted_at` back to NULL. Used when processing `page.undeleted` webhook events.

### `setSyncMeta(db, key, value)`

INSERT OR REPLACE into `sync_meta`. Used to track sync timestamps and webhook verification token.

### `logSyncEvent(db, event)`

Inserts an audit record into `sync_events`. Payload is JSON-stringified if provided.

```typescript
logSyncEvent(db, {
  event_type: "full_sync",     // or reconciliation, webhook, error
  source: "startup",           // or scheduled, notion_webhook, manual_sync
  payload: { pages: 42, elapsed_ms: 1200 }
});
```

## Read Operations

### `getAllTasks(db): Task[]`

JOINs `tasks` with `pages`, excludes soft-deleted rows, and maps SQLite row format to the frontend `Task` interface. JSON columns (`project_ids`, `dependencies`, `properties`) are parsed.

### `getAllProjects(db): Project[]`

Same pattern for projects. Parses `area_ids` and `properties` JSON columns.

### `getAllAreas(db): Area[]`

Minimal — returns id, name, and parsed properties.

### `getPageCount(db)`

Returns `{ tasks, projects, areas }` counts, grouped by `database_id`, excluding soft-deleted pages.

### `getSyncStatus(db): SyncStatus`

Aggregates sync metadata and event count into a single status object for the API.

### `getSyncEvents(db, limit, offset): SyncEvent[]`

Paginated query ordered by `created_at DESC`.

### `getAllPageIds(db, databaseId): string[]`

Returns all active page IDs for a given database. Used during full sync to detect deletions (pages present in DB but absent from Notion response).

### `getSyncMeta(db, key): string | null`

Reads a single metadata value by key.

## Database Lifecycle

**Source:** `app/server/db/index.ts`

```typescript
initDb(path)   // Create and configure SQLite database
getDb()        // Get singleton instance (throws if not initialized)
closeDb()      // Close connection and clear singleton
```

The database is initialized once at server startup and closed during graceful shutdown.

## Property Extraction Pipeline

See [[Property Mapping]] for the complete mapping of Notion properties to SQLite columns. The extraction pipeline:

1. Parse `raw_json` into a JavaScript object
2. Access `raw.properties` object
3. Apply type-specific extractors (`extractTitle`, `extractSelect`, `extractDate`, `extractRelationIds`)
4. Store core fields in dedicated columns
5. Bundle remaining properties into a JSON blob via `extractProperties()`
