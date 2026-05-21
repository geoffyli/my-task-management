import type { Database } from "bun:sqlite";

export interface PushSubscriptionRow {
  id: number;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  user_agent: string | null;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface NotificationPreferencesRow {
  id: number;
  device_id: number | null;
  enabled: number;
  sync_failure: number;
  sync_recovery: number;
  db_health: number;
  tasks_due_today: number;
  tasks_due_tomorrow: number;
  overdue_tasks: number;
  daily_digest: number;
  weekly_review: number;
  blocked_alert: number;
  stale_alert: number;
  due_today_time: string;
  due_tomorrow_time: string;
  daily_digest_time: string;
  weekly_review_time: string;
  blocked_alert_time: string;
  stale_alert_time: string;
  weekly_review_day: number;
  blocked_threshold_days: number;
  stale_threshold_days: number;
  timezone: string;
}

export function insertSubscription(
  db: Database,
  sub: {
    endpoint: string;
    keys_p256dh: string;
    keys_auth: string;
    user_agent?: string | null;
    device_name?: string | null;
  }
): number {
  const deviceName = sub.device_name ?? (sub.user_agent ? parseDeviceName(sub.user_agent) : null);
  db.run(
    `INSERT INTO push_subscriptions (endpoint, keys_p256dh, keys_auth, user_agent, device_name)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       keys_p256dh = excluded.keys_p256dh,
       keys_auth = excluded.keys_auth,
       user_agent = excluded.user_agent,
       device_name = excluded.device_name`,
    [sub.endpoint, sub.keys_p256dh, sub.keys_auth, sub.user_agent ?? null, deviceName]
  );
  const row = db.query("SELECT id FROM push_subscriptions WHERE endpoint = ?").get(sub.endpoint) as { id: number };
  return row.id;
}

export function removeSubscription(db: Database, endpoint: string): void {
  db.run("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
}

export function removeSubscriptionById(db: Database, id: number): void {
  db.run("DELETE FROM push_subscriptions WHERE id = ?", [id]);
}

export function getAllSubscriptions(db: Database): PushSubscriptionRow[] {
  return db.query("SELECT * FROM push_subscriptions").all() as PushSubscriptionRow[];
}

export function getSubscriptionByEndpoint(db: Database, endpoint: string): PushSubscriptionRow | null {
  return (db.query("SELECT * FROM push_subscriptions WHERE endpoint = ?").get(endpoint) as PushSubscriptionRow) ?? null;
}

export function updateDeviceName(db: Database, id: number, name: string): void {
  db.run("UPDATE push_subscriptions SET device_name = ? WHERE id = ?", [name, id]);
}

export function touchLastUsed(db: Database, id: number): void {
  db.run("UPDATE push_subscriptions SET last_used_at = datetime('now') WHERE id = ?", [id]);
}

export function getGlobalPreferences(db: Database): NotificationPreferencesRow | null {
  return (db.query("SELECT * FROM notification_preferences WHERE device_id IS NULL").get() as NotificationPreferencesRow) ?? null;
}

export function getDevicePreferences(db: Database, deviceId: number): NotificationPreferencesRow | null {
  return (db.query("SELECT * FROM notification_preferences WHERE device_id = ?").get(deviceId) as NotificationPreferencesRow) ?? null;
}

export function getAllPreferences(db: Database): NotificationPreferencesRow[] {
  return db.query("SELECT * FROM notification_preferences").all() as NotificationPreferencesRow[];
}

const ALLOWED_PREF_FIELDS = new Set([
  "enabled", "sync_failure", "sync_recovery", "db_health",
  "tasks_due_today", "tasks_due_tomorrow", "overdue_tasks",
  "daily_digest", "weekly_review", "blocked_alert", "stale_alert",
  "due_today_time", "due_tomorrow_time", "daily_digest_time",
  "weekly_review_time", "blocked_alert_time", "stale_alert_time",
  "weekly_review_day", "blocked_threshold_days", "stale_threshold_days",
  "timezone",
]);

export function upsertGlobalPreferences(db: Database, prefs: Partial<Omit<NotificationPreferencesRow, "id" | "device_id">>): void {
  const existing = getGlobalPreferences(db);
  if (!existing) {
    db.run("INSERT INTO notification_preferences (device_id) VALUES (NULL)");
  }

  const fields = Object.keys(prefs).filter((f) => ALLOWED_PREF_FIELDS.has(f));
  if (fields.length === 0) return;

  const setClauses = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (prefs as any)[f]);
  db.run(
    `UPDATE notification_preferences SET ${setClauses} WHERE device_id IS NULL`,
    values
  );
}

export function upsertDevicePreferences(
  db: Database,
  deviceId: number,
  prefs: Partial<Omit<NotificationPreferencesRow, "id" | "device_id">>
): void {
  const existing = getDevicePreferences(db, deviceId);
  if (!existing) {
    db.run("INSERT INTO notification_preferences (device_id) VALUES (?)", [deviceId]);
  }

  const fields = Object.keys(prefs).filter((f) => ALLOWED_PREF_FIELDS.has(f));
  if (fields.length === 0) return;

  const setClauses = fields.map((f) => `${f} = ?`).join(", ");
  const values = [...fields.map((f) => (prefs as any)[f]), deviceId];
  db.run(
    `UPDATE notification_preferences SET ${setClauses} WHERE device_id = ?`,
    values
  );
}

export function deleteDevicePreferences(db: Database, deviceId: number): void {
  db.run("DELETE FROM notification_preferences WHERE device_id = ?", [deviceId]);
}

export function parseDeviceName(userAgent: string): string {
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/Macintosh|Mac OS/i.test(userAgent)) {
    if (/Firefox/i.test(userAgent)) return "Mac Firefox";
    if (/Edg/i.test(userAgent)) return "Mac Edge";
    if (/Chrome/i.test(userAgent)) return "Mac Chrome";
    return "Mac Safari";
  }
  if (/Windows/i.test(userAgent)) {
    if (/Firefox/i.test(userAgent)) return "Firefox on Windows";
    if (/Edg/i.test(userAgent)) return "Edge on Windows";
    return "Chrome on Windows";
  }
  if (/Android/i.test(userAgent)) {
    if (/Firefox/i.test(userAgent)) return "Firefox on Android";
    return "Chrome on Android";
  }
  if (/Linux/i.test(userAgent)) {
    if (/Firefox/i.test(userAgent)) return "Firefox on Linux";
    return "Chrome on Linux";
  }
  return "Unknown Device";
}
