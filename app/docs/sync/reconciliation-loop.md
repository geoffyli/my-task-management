---
parent: "[[sync-moc]]"
tags:
  - sync
  - reconciliation
  - incremental
related:
  - "[[sync-overview]]"
  - "[[notion-client]]"
  - "[[database-operations]]"
---

# Reconciliation Loop

Periodic incremental sync that queries Notion for pages modified since the last sync. Catches changes missed by webhooks.

**Source:** `server/sync/reconcile.ts`

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| Interval | 15 minutes | Time between reconciliation runs |
| Filter | `last_edited_time > last_sync_time` | Only fetch recently modified pages |

## When It Runs

Started automatically after the boot sequence completes. Fires every 15 minutes via `setInterval`.

```typescript
startReconciliationLoop(db, intervalMs = 15 * 60 * 1000)
```

## Process

1. **Read** `last_sync_time` from `sync_meta`
   - If not found → skip (full sync hasn't run yet)
2. **Record** sync start time (used as the new `last_sync_time`)
3. **For each database** (tasks, projects, areas):
   - Call `queryDatabaseIncremental(apiKey, dataSourceId, lastSync)`
   - This filters for `last_edited_time > lastSync` and sorts ascending
   - Upsert each returned page individually
4. **Update metadata:**
   - `last_reconciliation` → current ISO timestamp
   - `last_sync_time` → sync start time
5. **Log event** only if `totalUpdated > 0` (silent when no changes)

## Key Differences from Full Sync

| Aspect | Full Sync | Reconciliation |
|--------|-----------|----------------|
| Scope | All pages | Only modified since last sync |
| Soft-delete detection | Yes | No |
| Write pattern | `bulkUpsert()` (batch transaction) | Individual `upsertPage()` calls |
| Event logging | Always | Only when changes detected |
| Trigger | Manual / startup | Automatic timer |

## Error Handling

Errors in the reconciliation loop are caught and logged but don't crash the process:

```typescript
setInterval(async () => {
  try { await reconcile(db); }
  catch (err) {
    console.error("[reconcile] Error:", err);
    logSyncEvent(db, { event_type: "error", source: "reconciliation", payload: { error: String(err) } });
  }
}, intervalMs);
```

## Sync Mutex

The reconciliation respects the global `syncing` flag. If a full sync is already running when the timer fires, the reconciliation is silently skipped.

## Why Not Just Webhooks?

Webhooks can miss events due to:
- Network failures or server downtime
- Notion delivery issues
- Initial setup before webhook is verified

The reconciliation loop acts as a safety net, ensuring eventual consistency even if real-time updates fail.
