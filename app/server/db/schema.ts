import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";

const SCHEMA_VERSION = 3;

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
      started_date TEXT,
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

  // Schema versioning and migrations
  const currentVersion = Number(
    (db.query("SELECT value FROM sync_meta WHERE key = 'schema_version'").get() as { value: string } | null)?.value ?? "0"
  );

  if (currentVersion < 2) {
    const cols = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "started_date")) {
      db.run("ALTER TABLE tasks ADD COLUMN started_date TEXT");
    }
  }

  if (currentVersion < 3) {
    db.run(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL UNIQUE,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        user_agent TEXT,
        device_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_used_at TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER REFERENCES push_subscriptions(id) ON DELETE CASCADE,
        enabled INTEGER NOT NULL DEFAULT 1,
        sync_failure INTEGER NOT NULL DEFAULT 1,
        sync_recovery INTEGER NOT NULL DEFAULT 1,
        db_health INTEGER NOT NULL DEFAULT 1,
        tasks_due_today INTEGER NOT NULL DEFAULT 1,
        tasks_due_tomorrow INTEGER NOT NULL DEFAULT 1,
        overdue_tasks INTEGER NOT NULL DEFAULT 1,
        daily_digest INTEGER NOT NULL DEFAULT 1,
        weekly_review INTEGER NOT NULL DEFAULT 1,
        blocked_alert INTEGER NOT NULL DEFAULT 1,
        stale_alert INTEGER NOT NULL DEFAULT 1,
        due_today_time TEXT NOT NULL DEFAULT '08:00',
        due_tomorrow_time TEXT NOT NULL DEFAULT '08:00',
        daily_digest_time TEXT NOT NULL DEFAULT '07:30',
        weekly_review_time TEXT NOT NULL DEFAULT '18:00',
        blocked_alert_time TEXT NOT NULL DEFAULT '09:00',
        stale_alert_time TEXT NOT NULL DEFAULT '09:00',
        weekly_review_day INTEGER NOT NULL DEFAULT 0,
        blocked_threshold_days INTEGER NOT NULL DEFAULT 3,
        stale_threshold_days INTEGER NOT NULL DEFAULT 7
      )
    `);

    db.run("CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint)");
    db.run("CREATE INDEX IF NOT EXISTS idx_notification_preferences_device ON notification_preferences(device_id)");
    db.run("INSERT OR IGNORE INTO notification_preferences (device_id) VALUES (NULL)");
  }

  if (currentVersion < SCHEMA_VERSION) {
    db.run("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
    console.log(`[db] Schema upgraded to version ${SCHEMA_VERSION}`);
  }

  return db;
}
