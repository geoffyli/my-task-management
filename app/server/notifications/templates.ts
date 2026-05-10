import type { NotificationPayload } from "./push-service";

export function syncFailureTemplate(error: string): NotificationPayload {
  const body = error.length > 100 ? error.slice(0, 97) + "..." : error;
  return {
    title: "Sync Failed",
    body,
    tag: "sync-failure",
    data: { url: "/health" },
  };
}

export function syncRecoveryTemplate(): NotificationPayload {
  return {
    title: "Sync Recovered",
    body: "Sync is working again. All data is up to date.",
    tag: "sync-recovery",
    data: { url: "/health" },
  };
}

export function dbHealthTemplate(message: string): NotificationPayload {
  return {
    title: "Database Health Alert",
    body: message,
    tag: "db-health",
    data: { url: "/health" },
  };
}

export function tasksDueTodayTemplate(tasks: { name: string; importance: string | null }[]): NotificationPayload {
  const count = tasks.length;
  const highPriority = tasks.find((t) => t.importance === "High");
  const body = highPriority
    ? `${count} task${count > 1 ? "s" : ""} due today. High priority: ${highPriority.name}`
    : `${count} task${count > 1 ? "s" : ""} due today`;

  return {
    title: `${count} Task${count > 1 ? "s" : ""} Due Today`,
    body,
    tag: "due-today",
    data: { url: "/" },
  };
}

export function tasksDueTomorrowTemplate(tasks: { name: string; importance: string | null }[]): NotificationPayload {
  const count = tasks.length;
  const highPriority = tasks.find((t) => t.importance === "High");
  const body = highPriority
    ? `${count} task${count > 1 ? "s" : ""} due tomorrow. High priority: ${highPriority.name}`
    : `${count} task${count > 1 ? "s" : ""} due tomorrow`;

  return {
    title: `${count} Task${count > 1 ? "s" : ""} Due Tomorrow`,
    body,
    tag: "due-tomorrow",
    data: { url: "/" },
  };
}

export function overdueTasksTemplate(tasks: { name: string; importance: string | null }[]): NotificationPayload {
  const count = tasks.length;
  const body = count === 1
    ? `Overdue: ${tasks[0]!.name}`
    : `${count} tasks are overdue`;

  return {
    title: "Overdue Tasks",
    body,
    tag: "overdue-tasks",
    data: { url: "/" },
  };
}

export function dailyDigestTemplate(summary: { total: number; inProgress: number; blocked: number }): NotificationPayload {
  return {
    title: "Morning Digest",
    body: `${summary.total} tasks today, ${summary.inProgress} in progress, ${summary.blocked} blocked`,
    tag: "daily-digest",
    data: { url: "/" },
  };
}

export function weeklyReviewTemplate(summary: { upcoming: number; overdue: number; completed: number }): NotificationPayload {
  return {
    title: "Weekly Review",
    body: `${summary.upcoming} upcoming, ${summary.overdue} overdue, ${summary.completed} completed this week`,
    tag: "weekly-review",
    data: { url: "/" },
  };
}

export function blockedAlertTemplate(tasks: { name: string; days: number }[]): NotificationPayload {
  const count = tasks.length;
  const body = count === 1
    ? `"${tasks[0]!.name}" blocked for ${tasks[0]!.days} days`
    : `${count} tasks blocked for extended periods`;

  return {
    title: "Blocked Tasks Alert",
    body,
    tag: "blocked-alert",
    data: { url: "/" },
  };
}

export function staleAlertTemplate(tasks: { name: string; days: number }[]): NotificationPayload {
  const count = tasks.length;
  const body = count === 1
    ? `"${tasks[0]!.name}" untouched for ${tasks[0]!.days} days`
    : `${count} tasks have had no activity recently`;

  return {
    title: "Stale Tasks Alert",
    body,
    tag: "stale-alert",
    data: { url: "/" },
  };
}
