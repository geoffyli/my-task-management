import type { Database } from "bun:sqlite";
import { bulkUpsert, softDeletePage, getAllPageIds, setSyncMeta, logSyncEvent, checkpointDb } from "../db";
import type { RawPage } from "../db";
import { queryDatabase, getNotionKey, DATA_SOURCES } from "./notion-client";

export async function fullSync(db: Database): Promise<void> {
  const startTime = Date.now();
  const syncStartIso = new Date().toISOString();
  const apiKey = getNotionKey();
  let totalPages = 0;

  console.log("[sync] Starting full sync...");

  for (const [dbName, dataSourceId] of Object.entries(DATA_SOURCES)) {
    const pages = await queryDatabase(apiKey, dataSourceId, {});

    const rawPages: RawPage[] = pages.map((page) => ({
      id: page.id,
      database_id: dbName,
      raw_json: JSON.stringify(page),
      last_edited_time: page.last_edited_time,
    }));

    bulkUpsert(db, rawPages);

    const existingIds = getAllPageIds(db, dbName, syncStartIso);
    const fetchedIds = new Set(pages.map((p) => p.id));
    for (const existingId of existingIds) {
      if (!fetchedIds.has(existingId)) {
        softDeletePage(db, existingId);
      }
    }

    totalPages += pages.length;
    console.log(`[sync] ${dbName}: synced ${pages.length} pages`);
  }

  const now = new Date().toISOString();
  setSyncMeta(db, "last_full_sync", now);
  setSyncMeta(db, "last_sync_time", syncStartIso);

  logSyncEvent(db, {
    event_type: "full_sync",
    source: "startup",
    payload: { totalPages, elapsed: Date.now() - startTime },
  });

  console.log(`[sync] Full sync complete: ${totalPages} pages in ${Date.now() - startTime}ms`);

  checkpointDb();
}
