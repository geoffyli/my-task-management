import type { Database } from "bun:sqlite";

export interface RawPage {
  id: string;
  database_id: string;
  raw_json: string;
  last_edited_time: string;
}

function extractTitle(prop: any): string {
  return prop?.title?.[0]?.plain_text ?? "(untitled)";
}

function extractSelect(prop: any): string | null {
  return prop?.select?.name ?? null;
}

function extractDate(prop: any): string | null {
  return prop?.date?.start ?? null;
}

export function extractRelationIds(prop: any): string[] {
  return (prop?.relation ?? []).map((r: any) => r.id);
}

function extractProperties(properties: Record<string, any>, coreKeys: string[]): string {
  const bag: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (coreKeys.includes(key)) continue;
    bag[key] = value;
  }
  return JSON.stringify(bag);
}

const TASK_CORE_KEYS = [
  "Task Name", "Status", "Importance", "Urgency", "Project",
  "Assigned Date", "Started Date", "Closed Date", "Deadline", "Depends on",
];

const PROJECT_CORE_KEYS = ["Name", "Status", "Priority", "Areas", "Date"];

const AREA_CORE_KEYS = ["Area Name"];

function extractTaskRow(pageId: string, raw: any) {
  const p = raw.properties;
  const status = extractSelect(p["Status"]) ?? "Not Started";
  const assignedDate = extractDate(p["Assigned Date"]);
  const startedDate = extractDate(p["Started Date"]);
  const closedDate = extractDate(p["Closed Date"]);

  return {
    page_id: pageId,
    title: extractTitle(p["Task Name"]),
    status,
    importance: extractSelect(p["Importance"]),
    urgency: extractSelect(p["Urgency"]),
    assigned_date: assignedDate,
    started_date: startedDate,
    completion_date: closedDate,
    deadline: extractDate(p["Deadline"]),
    created_time: raw.created_time,
    last_edited_time: raw.last_edited_time,
    project_ids: JSON.stringify(extractRelationIds(p["Project"])),
    dependencies: JSON.stringify(extractRelationIds(p["Depends on"])),
    properties: extractProperties(p, TASK_CORE_KEYS),
  };
}

function extractProjectRow(pageId: string, raw: any) {
  const p = raw.properties;
  return {
    page_id: pageId,
    title: extractTitle(p["Name"]),
    status: extractSelect(p["Status"]) ?? "In Progress",
    priority: extractSelect(p["Priority"]),
    area_ids: JSON.stringify(extractRelationIds(p["Areas"])),
    start_date: p["Date"]?.date?.start ?? null,
    end_date: p["Date"]?.date?.end ?? null,
    properties: extractProperties(p, PROJECT_CORE_KEYS),
  };
}

function extractAreaRow(pageId: string, raw: any) {
  const p = raw.properties;
  return {
    page_id: pageId,
    title: extractTitle(p["Area Name"]),
    properties: extractProperties(p, AREA_CORE_KEYS),
  };
}

export function upsertPage(db: Database, page: RawPage): void {
  const now = new Date().toISOString();

  db.run(
    `INSERT OR REPLACE INTO pages (id, database_id, raw_json, last_edited_time, synced_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, NULL)`,
    [page.id, page.database_id, page.raw_json, page.last_edited_time, now]
  );

  const raw = JSON.parse(page.raw_json);

  switch (page.database_id) {
    case "tasks": {
      const row = extractTaskRow(page.id, raw);
      db.run(
        `INSERT OR REPLACE INTO tasks (page_id, title, status, importance, urgency, assigned_date, started_date, completion_date, deadline, created_time, last_edited_time, project_ids, dependencies, properties)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.page_id, row.title, row.status, row.importance, row.urgency, row.assigned_date, row.started_date, row.completion_date, row.deadline, row.created_time, row.last_edited_time, row.project_ids, row.dependencies, row.properties]
      );
      break;
    }
    case "projects": {
      const row = extractProjectRow(page.id, raw);
      db.run(
        `INSERT OR REPLACE INTO projects (page_id, title, status, priority, area_ids, start_date, end_date, properties)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.page_id, row.title, row.status, row.priority, row.area_ids, row.start_date, row.end_date, row.properties]
      );
      break;
    }
    case "areas": {
      const row = extractAreaRow(page.id, raw);
      db.run(
        `INSERT OR REPLACE INTO areas (page_id, title, properties)
         VALUES (?, ?, ?)`,
        [row.page_id, row.title, row.properties]
      );
      break;
    }
  }
}

export function softDeletePage(db: Database, id: string): void {
  db.run("UPDATE pages SET deleted_at = datetime('now') WHERE id = ?", [id]);
}

export function restorePage(db: Database, id: string): void {
  db.run("UPDATE pages SET deleted_at = NULL WHERE id = ?", [id]);
}

export function bulkUpsert(db: Database, pages: RawPage[]): void {
  const transaction = db.transaction(() => {
    for (const page of pages) {
      upsertPage(db, page);
    }
  });
  transaction();
}

export function setSyncMeta(db: Database, key: string, value: string): void {
  db.run(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    [key, value]
  );
}

export function getSyncMeta(db: Database, key: string): string | null {
  const row = db.query("SELECT value FROM sync_meta WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

export function logSyncEvent(
  db: Database,
  event: { event_type: string; source: string; payload?: any }
): void {
  db.run(
    "INSERT INTO sync_events (event_type, source, payload) VALUES (?, ?, ?)",
    [event.event_type, event.source, event.payload ? JSON.stringify(event.payload) : null]
  );
}

export function cleanupOldEvents(db: Database, retentionDays = 30): number {
  const result = db.run(
    "DELETE FROM sync_events WHERE created_at < datetime('now', ?)",
    [`-${retentionDays} days`]
  );
  return result.changes;
}

export function purgeSoftDeletedPages(db: Database, retentionDays = 90): number {
  const result = db.run(
    "DELETE FROM pages WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)",
    [`-${retentionDays} days`]
  );
  return result.changes;
}
