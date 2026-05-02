import type { Database } from "bun:sqlite";
import type { Task, Project, Area } from "../../src/api/types";

export interface SyncStatus {
  lastFullSync: string | null;
  lastReconciliation: string | null;
  lastWebhook: string | null;
  pagesTracked: { tasks: number; projects: number; areas: number };
  totalEvents: number;
}

export interface SyncEvent {
  id: number;
  event_type: string;
  source: string;
  payload: string | null;
  created_at: string;
}

export function getAllTasks(db: Database): Task[] {
  const rows = db.query(`
    SELECT t.* FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE p.deleted_at IS NULL AND p.database_id = 'tasks'
  `).all() as any[];

  return rows.map((row) => ({
    id: row.page_id,
    name: row.title,
    status: row.status,
    priority: row.priority,
    projectIds: JSON.parse(row.project_ids || "[]"),
    assignedDate: row.assigned_date,
    initialAssignedDate: row.initial_assigned_date,
    deadline: row.deadline,
    createdTime: row.created_time,
    lastEditedTime: row.last_edited_time,
    dependencies: JSON.parse(row.dependencies || "[]"),
    properties: JSON.parse(row.properties || "{}"),
  }));
}

export function getAllProjects(db: Database): Project[] {
  const rows = db.query(`
    SELECT pr.* FROM projects pr
    JOIN pages p ON pr.page_id = p.id
    WHERE p.deleted_at IS NULL AND p.database_id = 'projects'
  `).all() as any[];

  return rows.map((row) => ({
    id: row.page_id,
    name: row.title,
    status: row.status,
    priority: row.priority,
    areaIds: JSON.parse(row.area_ids || "[]"),
    startDate: row.start_date,
    endDate: row.end_date,
    properties: JSON.parse(row.properties || "{}"),
  }));
}

export function getAllAreas(db: Database): Area[] {
  const rows = db.query(`
    SELECT a.* FROM areas a
    JOIN pages p ON a.page_id = p.id
    WHERE p.deleted_at IS NULL AND p.database_id = 'areas'
  `).all() as any[];

  return rows.map((row) => ({
    id: row.page_id,
    name: row.title,
    properties: JSON.parse(row.properties || "{}"),
  }));
}

export function getPageCount(db: Database): { tasks: number; projects: number; areas: number } {
  const counts = db.query(`
    SELECT database_id, COUNT(*) as count
    FROM pages WHERE deleted_at IS NULL
    GROUP BY database_id
  `).all() as { database_id: string; count: number }[];

  const map = Object.fromEntries(counts.map((c) => [c.database_id, c.count]));
  return {
    tasks: map.tasks ?? 0,
    projects: map.projects ?? 0,
    areas: map.areas ?? 0,
  };
}

export function getSyncStatus(db: Database): SyncStatus {
  const getMeta = (key: string): string | null => {
    const row = db.query("SELECT value FROM sync_meta WHERE key = ?").get(key) as { value: string } | null;
    return row?.value ?? null;
  };

  const eventCount = db.query("SELECT COUNT(*) as count FROM sync_events").get() as { count: number };

  return {
    lastFullSync: getMeta("last_full_sync"),
    lastReconciliation: getMeta("last_reconciliation"),
    lastWebhook: getMeta("last_webhook"),
    pagesTracked: getPageCount(db),
    totalEvents: eventCount.count,
  };
}

export function getSyncEvents(db: Database, limit = 50, offset = 0): SyncEvent[] {
  return db.query(
    "SELECT * FROM sync_events ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(limit, offset) as SyncEvent[];
}

export function getAllPageIds(db: Database, databaseId: string): string[] {
  const rows = db.query(
    "SELECT id FROM pages WHERE database_id = ? AND deleted_at IS NULL"
  ).all(databaseId) as { id: string }[];
  return rows.map((r) => r.id);
}
