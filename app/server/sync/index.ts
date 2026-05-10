import type { Database } from "bun:sqlite";
import { logSyncEvent } from "../db";
import { fullSync as _fullSync } from "./full-sync";
import { reconcile as _reconcile } from "./reconcile";
import { emitSyncFailure, emitSyncRecovery } from "../notifications/event-triggers";

let syncing = false;

export async function fullSync(db: Database): Promise<void> {
  if (syncing) {
    console.log("[sync] Sync already in progress, skipping");
    return;
  }
  syncing = true;
  try {
    await _fullSync(db);
    emitSyncRecovery(db);
  } finally {
    syncing = false;
  }
}

export async function reconcile(db: Database): Promise<void> {
  if (syncing) {
    console.log("[sync] Sync already in progress, skipping reconciliation");
    return;
  }
  syncing = true;
  try {
    await _reconcile(db);
    emitSyncRecovery(db);
  } finally {
    syncing = false;
  }
}

export function startReconciliationLoop(
  db: Database,
  intervalMs: number = 15 * 60 * 1000
): ReturnType<typeof setInterval> {
  console.log(`[reconcile] Starting reconciliation loop (interval: ${intervalMs / 1000}s)`);
  return setInterval(async () => {
    try {
      await reconcile(db);
    } catch (err) {
      console.error("[reconcile] Error during reconciliation:", err);
      logSyncEvent(db, {
        event_type: "error",
        source: "reconciliation",
        payload: { error: String(err) },
      });
      emitSyncFailure(db, String(err));
    }
  }, intervalMs);
}

export { createWebhookHandler } from "./webhook";
export { queryDatabase, queryDatabaseIncremental, fetchPage, getNotionKey, DATA_SOURCES, type NotionPage } from "./notion-client";
