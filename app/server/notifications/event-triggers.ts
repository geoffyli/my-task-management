import type { Database } from "bun:sqlite";
import { setSyncMeta, getSyncMeta } from "../db";
import { sendToAll } from "./push-service";
import { syncFailureTemplate, syncRecoveryTemplate, overdueTasksTemplate } from "./templates";

export function emitSyncFailure(db: Database, error: string): void {
  setSyncMeta(db, "sync_failure_active", "1");
  sendToAll(db, syncFailureTemplate(error), "sync_failure")
    .catch((err) => console.error("[push] Failed to emit sync_failure:", err));
}

export function emitSyncRecovery(db: Database): void {
  const active = getSyncMeta(db, "sync_failure_active");
  if (active === "1") {
    setSyncMeta(db, "sync_failure_active", "0");
    sendToAll(db, syncRecoveryTemplate(), "sync_recovery")
      .catch((err) => console.error("[push] Failed to emit sync_recovery:", err));
  }
}

export function emitOverdueTasks(db: Database, tasks: { name: string; importance: string | null }[]): void {
  if (tasks.length > 0) {
    sendToAll(db, overdueTasksTemplate(tasks), "overdue_tasks")
      .catch((err) => console.error("[push] Failed to emit overdue_tasks:", err));
  }
}
