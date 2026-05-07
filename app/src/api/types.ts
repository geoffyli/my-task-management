export interface Task {
  id: string;
  name: string;
  status: "Not Started" | "In Progress" | "Done" | "Cancelled" | "Blocked";
  importance: "High" | "Medium" | "Low";
  urgency: "High" | "Medium" | "Low" | "Overdue" | null;
  projectIds: string[];
  assignedDate: string | null;
  initialAssignedDate: string | null;
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
  status: "In Progress" | "Completed";
  priority: "High" | "Medium" | "Low";
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
