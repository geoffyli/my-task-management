export interface Task {
  id: string;
  name: string;
  status: "Not Started" | "In Progress" | "Done" | "Cancelled" | "Blocked";
  importance: "High" | "Medium" | "Low" | null;
  urgency: "High" | "Medium" | "Low" | "Overdue" | null;
  projectIds: string[];
  assignedDate: string | null;
  startedDate: string | null;
  closedDate: string | null;
  deadline: string | null;
  createdTime: string;
  lastEditedTime: string;
  dependencies: string[];
  properties: Record<string, unknown>;
}

export interface Project {
  id: string;
  name: string;
  status: "Not Started" | "In Progress" | "On Hold" | "In Maintenance" | "Archived";
  priority: "High" | "Medium" | "Low" | null;
  areaIds: string[];
  startDate: string | null;
  endDate: string | null;
  properties: Record<string, unknown>;
}

export interface Area {
  id: string;
  name: string;
  properties: Record<string, unknown>;
}

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

export interface WebhookStatus {
  webhookUrl: string | null;
  verified: boolean;
}

export interface PushDevice {
  id: number;
  endpoint: string;
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
}

export interface NotificationPreferences {
  global: NotificationPreferencesRow | null;
  deviceOverrides: NotificationPreferencesRow[];
}
