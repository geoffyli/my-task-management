import { Database } from "bun:sqlite";
import { initializeDatabase } from "./schema";

let db: Database | null = null;

export function initDb(path: string): Database {
  db = initializeDatabase(path);
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export { upsertPage, softDeletePage, restorePage, bulkUpsert, setSyncMeta, getSyncMeta, logSyncEvent } from "./store";
export type { RawPage } from "./store";
export { getAllTasks, getAllProjects, getAllAreas, getPageCount, getSyncStatus, getSyncEvents, getAllPageIds } from "./queries";
export type { SyncStatus, SyncEvent } from "./queries";
