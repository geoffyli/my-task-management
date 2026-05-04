import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";

export function initializeDatabase(dbPath: string): Database {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath, { create: true });

  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      database_id TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      last_edited_time TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      page_id TEXT PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      title TEXT,
      status TEXT,
      importance TEXT,
      urgency TEXT,
      assigned_date TEXT,
      initial_assigned_date TEXT,
      completion_date TEXT,
      deadline TEXT,
      created_time TEXT,
      last_edited_time TEXT,
      project_ids TEXT,
      dependencies TEXT,
      properties TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      page_id TEXT PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      title TEXT,
      status TEXT,
      priority TEXT,
      area_ids TEXT,
      start_date TEXT,
      end_date TEXT,
      properties TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS areas (
      page_id TEXT PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      title TEXT,
      properties TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      source TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_pages_database_id ON pages(database_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_pages_last_edited_time ON pages(last_edited_time)");
  db.run("CREATE INDEX IF NOT EXISTS idx_pages_deleted_at ON pages(deleted_at)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_assigned_date ON tasks(assigned_date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at)");

  return db;
}
