import { Cron } from "croner";
import type { Database } from "bun:sqlite";
import { getGlobalPreferences } from "../db/push";
import { sendToAll } from "./push-service";
import {
  tasksDueTodayTemplate,
  tasksDueTomorrowTemplate,
  overdueTasksTemplate,
  dailyDigestTemplate,
  weeklyReviewTemplate,
  blockedAlertTemplate,
  staleAlertTemplate,
} from "./templates";

const jobs = new Map<string, Cron>();

function timeToCron(time: string): { minute: string; hour: string } {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    console.error(`[scheduler] Invalid time format: "${time}", defaulting to 09:00`);
    return { minute: "0", hour: "9" };
  }
  return { minute: match[2]!, hour: match[1]! };
}

function queryTasksDueOn(db: Database, dateExpr: string): { name: string; importance: string | null }[] {
  return db.query(`
    SELECT t.title as name, t.importance
    FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.deadline = date(${dateExpr})
      AND t.status NOT IN ('Done', 'Cancelled')
      AND p.deleted_at IS NULL
  `).all() as { name: string; importance: string | null }[];
}

function queryDailyDigest(db: Database): { total: number; inProgress: number; blocked: number } {
  const rows = db.query(`
    SELECT t.status, COUNT(*) as count
    FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.status NOT IN ('Done', 'Cancelled')
      AND p.deleted_at IS NULL
    GROUP BY t.status
  `).all() as { status: string; count: number }[];

  let total = 0;
  let inProgress = 0;
  let blocked = 0;
  for (const row of rows) {
    total += row.count;
    if (row.status === "In Progress") inProgress = row.count;
    if (row.status === "Blocked") blocked = row.count;
  }
  return { total, inProgress, blocked };
}

function queryWeeklyReview(db: Database): { upcoming: number; overdue: number; completed: number } {
  const upcoming = db.query(`
    SELECT COUNT(*) as count FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.deadline BETWEEN date('now') AND date('now', '+7 days')
      AND t.status NOT IN ('Done', 'Cancelled')
      AND p.deleted_at IS NULL
  `).get() as { count: number };

  const overdue = db.query(`
    SELECT COUNT(*) as count FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.deadline < date('now')
      AND t.status NOT IN ('Done', 'Cancelled')
      AND p.deleted_at IS NULL
  `).get() as { count: number };

  const completed = db.query(`
    SELECT COUNT(*) as count FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.completion_date BETWEEN date('now', '-7 days') AND date('now')
      AND p.deleted_at IS NULL
  `).get() as { count: number };

  return {
    upcoming: upcoming.count,
    overdue: overdue.count,
    completed: completed.count,
  };
}

function queryBlockedTasks(db: Database, thresholdDays: number): { name: string; days: number }[] {
  return db.query(`
    SELECT t.title as name,
      CAST(julianday('now') - julianday(t.last_edited_time) AS INTEGER) as days
    FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.status = 'Blocked'
      AND julianday('now') - julianday(t.last_edited_time) >= ?
      AND p.deleted_at IS NULL
    ORDER BY days DESC
  `).all(thresholdDays) as { name: string; days: number }[];
}

function queryStaleTasks(db: Database, thresholdDays: number): { name: string; days: number }[] {
  return db.query(`
    SELECT t.title as name,
      CAST(julianday('now') - julianday(t.last_edited_time) AS INTEGER) as days
    FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.status IN ('Not Started', 'In Progress')
      AND julianday('now') - julianday(t.last_edited_time) >= ?
      AND p.deleted_at IS NULL
    ORDER BY days DESC
  `).all(thresholdDays) as { name: string; days: number }[];
}

function queryOverdueTasks(db: Database): { name: string; importance: string | null }[] {
  return db.query(`
    SELECT t.title as name, t.importance
    FROM tasks t
    JOIN pages p ON t.page_id = p.id
    WHERE t.deadline < date('now')
      AND t.status NOT IN ('Done', 'Cancelled')
      AND p.deleted_at IS NULL
    ORDER BY t.deadline ASC
  `).all() as { name: string; importance: string | null }[];
}

export function initScheduler(db: Database): void {
  const prefs = getGlobalPreferences(db);
  if (!prefs) return;

  if (prefs.tasks_due_today) {
    const { minute, hour } = timeToCron(prefs.due_today_time);
    jobs.set("tasks_due_today", new Cron(`${minute} ${hour} * * *`, async () => {
      try {
        const tasks = queryTasksDueOn(db, "'now'");
        if (tasks.length > 0) {
          await sendToAll(db, tasksDueTodayTemplate(tasks), "tasks_due_today");
        }
      } catch (err) { console.error("[scheduler] tasks_due_today error:", err); }
    }));
  }

  if (prefs.tasks_due_tomorrow) {
    const { minute, hour } = timeToCron(prefs.due_tomorrow_time);
    jobs.set("tasks_due_tomorrow", new Cron(`${minute} ${hour} * * *`, async () => {
      try {
        const tasks = queryTasksDueOn(db, "'now', '+1 day'");
        if (tasks.length > 0) {
          await sendToAll(db, tasksDueTomorrowTemplate(tasks), "tasks_due_tomorrow");
        }
      } catch (err) { console.error("[scheduler] tasks_due_tomorrow error:", err); }
    }));
  }

  if (prefs.overdue_tasks) {
    const { minute, hour } = timeToCron(prefs.due_today_time);
    jobs.set("overdue_tasks", new Cron(`${minute} ${hour} * * *`, async () => {
      try {
        const tasks = queryOverdueTasks(db);
        if (tasks.length > 0) {
          await sendToAll(db, overdueTasksTemplate(tasks), "overdue_tasks");
        }
      } catch (err) { console.error("[scheduler] overdue_tasks error:", err); }
    }));
  }

  if (prefs.daily_digest) {
    const { minute, hour } = timeToCron(prefs.daily_digest_time);
    jobs.set("daily_digest", new Cron(`${minute} ${hour} * * *`, async () => {
      try {
        const summary = queryDailyDigest(db);
        await sendToAll(db, dailyDigestTemplate(summary), "daily_digest");
      } catch (err) { console.error("[scheduler] daily_digest error:", err); }
    }));
  }

  if (prefs.weekly_review) {
    const { minute, hour } = timeToCron(prefs.weekly_review_time);
    const day = prefs.weekly_review_day;
    jobs.set("weekly_review", new Cron(`${minute} ${hour} * * ${day}`, async () => {
      try {
        const summary = queryWeeklyReview(db);
        await sendToAll(db, weeklyReviewTemplate(summary), "weekly_review");
      } catch (err) { console.error("[scheduler] weekly_review error:", err); }
    }));
  }

  if (prefs.blocked_alert) {
    const { minute, hour } = timeToCron(prefs.blocked_alert_time);
    jobs.set("blocked_alert", new Cron(`${minute} ${hour} * * *`, async () => {
      try {
        const tasks = queryBlockedTasks(db, prefs.blocked_threshold_days);
        if (tasks.length > 0) {
          await sendToAll(db, blockedAlertTemplate(tasks), "blocked_alert");
        }
      } catch (err) { console.error("[scheduler] blocked_alert error:", err); }
    }));
  }

  if (prefs.stale_alert) {
    const { minute, hour } = timeToCron(prefs.stale_alert_time);
    jobs.set("stale_alert", new Cron(`${minute} ${hour} * * *`, async () => {
      try {
        const tasks = queryStaleTasks(db, prefs.stale_threshold_days);
        if (tasks.length > 0) {
          await sendToAll(db, staleAlertTemplate(tasks), "stale_alert");
        }
      } catch (err) { console.error("[scheduler] stale_alert error:", err); }
    }));
  }

  console.log(`[scheduler] Initialized ${jobs.size} notification jobs`);
}

export function stopScheduler(): void {
  for (const [name, job] of jobs) {
    job.stop();
  }
  jobs.clear();
  console.log("[scheduler] All jobs stopped");
}

export function restartScheduler(db: Database): void {
  stopScheduler();
  initScheduler(db);
}
