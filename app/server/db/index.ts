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

export function checkpointDb(): void {
  const instance = getDb();
  instance.run("PRAGMA wal_checkpoint(TRUNCATE)");
}

export function closeDb(): void {
  if (db) {
    db.run("PRAGMA wal_checkpoint(TRUNCATE)");
    db.close();
    db = null;
  }
}

export { upsertPage, softDeletePage, restorePage, bulkUpsert, setSyncMeta, getSyncMeta, logSyncEvent, cleanupOldEvents, purgeSoftDeletedPages } from "./store";
export type { RawPage } from "./store";
export { getAllTasks, getAllProjects, getAllAreas, getPageCount, getSyncStatus, getSyncEvents, getAllPageIds } from "./queries";
export type { SyncStatus, SyncEvent } from "./queries";
export {
  insertSubscription,
  removeSubscription,
  removeSubscriptionById,
  getAllSubscriptions,
  getSubscriptionByEndpoint,
  updateDeviceName,
  touchLastUsed,
  getGlobalPreferences,
  getDevicePreferences,
  getAllPreferences,
  upsertGlobalPreferences,
  upsertDevicePreferences,
  deleteDevicePreferences,
  parseDeviceName,
} from "./push";
export type { PushSubscriptionRow, NotificationPreferencesRow } from "./push";
