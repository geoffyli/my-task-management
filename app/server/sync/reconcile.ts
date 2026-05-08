import type { Database } from "bun:sqlite";
import { upsertPage, getSyncMeta, setSyncMeta, logSyncEvent, checkpointDb, cleanupOldEvents, purgeSoftDeletedPages } from "../db";
import type { RawPage } from "../db";
import { queryDatabaseIncremental, getNotionKey, DATA_SOURCES } from "./notion-client";

export async function reconcile(db: Database): Promise<void> {
  const lastSync = getSyncMeta(db, "last_sync_time");
  if (!lastSync) {
    console.log("[reconcile] No last_sync_time found, skipping (full sync needed)");
    return;
  }

  const startTime = Date.now();
  const syncStartIso = new Date().toISOString();
  const apiKey = getNotionKey();
  let totalUpdated = 0;

  for (const [dbName, dataSourceId] of Object.entries(DATA_SOURCES)) {
    const pages = await queryDatabaseIncremental(apiKey, dataSourceId, lastSync);

    for (const page of pages) {
      const rawPage: RawPage = {
        id: page.id,
        database_id: dbName,
        raw_json: JSON.stringify(page),
        last_edited_time: page.last_edited_time,
      };
      upsertPage(db, rawPage);
    }

    totalUpdated += pages.length;
    if (pages.length > 0) {
      console.log(`[reconcile] ${dbName}: updated ${pages.length} pages`);
    }
  }

  const now = new Date().toISOString();
  setSyncMeta(db, "last_reconciliation", now);
  setSyncMeta(db, "last_sync_time", syncStartIso);

  if (totalUpdated > 0) {
    logSyncEvent(db, {
      event_type: "reconciliation",
      source: "scheduled",
      payload: { totalUpdated, elapsed: Date.now() - startTime },
    });
  }

  cleanupOldEvents(db);
  const pageRetentionDays = 90;
  const purged = purgeSoftDeletedPages(db, pageRetentionDays);
  if (purged > 0) {
    console.log(`[reconcile] purged ${purged} soft-deleted pages (>${pageRetentionDays} days)`);
    logSyncEvent(db, {
      event_type: "cleanup",
      source: "scheduled",
      payload: { purgedPages: purged },
    });
  }
  checkpointDb();
}

