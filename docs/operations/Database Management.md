---
parent: "[[Operations]]"
tags: []
related:
  - "[[Database Schema]]"
  - "[[Railway Deployment]]"
  - "[[Sync Overview]]"
---

# Database Management

SQLite database lifecycle, maintenance, and operational configuration for the analytics app.

**Source:** `app/server/db/` — schema, store, queries, and initialization.

## Database Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `journal_mode` | WAL | Concurrent readers during writes |
| `busy_timeout` | 5000ms | Retry on lock contention |
| `foreign_keys` | ON | Enforce referential integrity |

**Paths:**
- Development: `./data/analytics.db` (relative to app root)
- Production: `/app/data/analytics.db` (Railway volume mount)

## Schema Versioning

Migrations are tracked via a `schema_version` key in `sync_meta`. On startup, the initialization function checks the current version and runs any outstanding migrations sequentially.

```
Version 1: Original schema (tables + indexes)
Version 2: Added started_date column to tasks
```

**Adding a new migration:**
1. Increment `SCHEMA_VERSION` constant in `server/db/schema.ts`
2. Add a `if (currentVersion < N)` block with the migration SQL
3. The version is set automatically after all migrations complete

## WAL Checkpointing

The WAL (Write-Ahead Log) accumulates writes until checkpointed back into the main database file. Without periodic checkpointing, the WAL grows unbounded.

**When checkpoints run:**
- After every full sync (`fullSync()`)
- After every reconciliation cycle (every 15 minutes)
- On graceful shutdown (SIGTERM/SIGINT, before `closeDb()`)

**Checkpoint mode:** `TRUNCATE` — flushes WAL to main DB and resets WAL file to zero bytes.

## Sync Events Retention

The `sync_events` audit table has a 30-day rolling retention policy. Events older than 30 days are automatically deleted after each reconciliation cycle.

Growth rate: ~6 events/day (4 reconciliations + occasional webhooks/syncs).

## Health Monitoring

`GET /healthz` performs a lightweight DB query (`SELECT 1`) in addition to checking the ready flag:

| Response | Meaning |
|----------|---------|
| `200 { "status": "ok" }` | App ready, DB accessible |
| `503 { "status": "booting" }` | Startup in progress |
| `503 { "status": "degraded" }` | DB connection failed |

## Production Infrastructure (Railway)

| Component | Configuration |
|-----------|--------------|
| Volume | `task-management-analytics-volume`, mounted at `/app/data` |
| Size | 5 GB (auto-charged for usage) |
| Region | Southeast Asia (Singapore) |
| Replicas | 1 (required for SQLite — no concurrent write support) |
| Backups | Not available (requires Pro plan) |

## Data Recovery

All task/project/area data is a mirror of the Notion databases. If the database is lost:

1. Deploy the app (creates empty DB)
2. The boot sequence detects an empty database and triggers a full sync
3. Full sync fetches all pages from Notion and rebuilds the local cache
4. Reconciliation loop resumes from the new baseline

**What cannot be recovered:** The `sync_events` audit log (operational history only, not critical data).

## Maintenance Operations Summary

| Operation | Trigger | Frequency | Impact |
|-----------|---------|-----------|--------|
| WAL checkpoint | After sync/reconcile, on shutdown | Every 15 min + startup | <50ms for 5MB DB |
| Events cleanup | After reconciliation | Every 15 min (no-op when nothing to delete) | Negligible |
| Full sync | Boot (if empty), manual trigger | On demand | 5-15 seconds |
| Reconciliation | Timer | Every 15 minutes | 1-3 seconds |
