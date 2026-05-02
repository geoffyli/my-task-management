---
parent: "[[data-model-moc]]"
tags:
  - data-model
  - types
  - typescript
  - reference
related:
  - "[[property-mapping]]"
  - "[[api-routes]]"
  - "[[database-schema]]"
---

# Types Reference

All shared TypeScript interfaces are defined in `src/api/types.ts` and used by both frontend and backend.

## Task

```typescript
interface Task {
  id: string;
  name: string;
  status: "Not Started" | "In Progress" | "Done" | "Cancelled" | "Deferred";
  priority: "High" | "Medium" | "Low";
  projectIds: string[];
  assignedDate: string | null;
  initialAssignedDate: string | null;
  deadline: string | null;
  createdTime: string;
  lastEditedTime: string;
  dependencies: string[];
  properties: Record<string, unknown>;
}
```

| Field | Description |
|-------|-------------|
| `id` | Notion page ID |
| `name` | Task title from Notion |
| `status` | Current workflow state |
| `priority` | High / Medium / Low |
| `projectIds` | Array of related project page IDs (Notion relation) |
| `assignedDate` | When the task is scheduled for (may be rescheduled) |
| `initialAssignedDate` | Original assigned date (used for reschedule tracking) |
| `deadline` | Hard due date |
| `createdTime` | Notion creation timestamp |
| `lastEditedTime` | Notion last edit timestamp |
| `dependencies` | Array of task IDs this task is blocked by |
| `properties` | Catch-all for unmapped Notion properties |

## Project

```typescript
interface Project {
  id: string;
  name: string;
  status: "In Progress" | "Completed";
  priority: "High" | "Medium" | "Low";
  areaIds: string[];
  startDate: string | null;
  endDate: string | null;
  properties: Record<string, unknown>;
}
```

| Field | Description |
|-------|-------------|
| `id` | Notion page ID |
| `name` | Project title |
| `status` | In Progress or Completed |
| `priority` | High / Medium / Low |
| `areaIds` | Array of related area page IDs |
| `startDate` | Project start date (from Notion Date range) |
| `endDate` | Project end date (from Notion Date range) |
| `properties` | Catch-all for unmapped properties |

## Area

```typescript
interface Area {
  id: string;
  name: string;
  properties: Record<string, unknown>;
}
```

Areas are the highest-level grouping — life/work categories that contain projects.

## SyncStatus

```typescript
interface SyncStatus {
  lastFullSync: string | null;
  lastReconciliation: string | null;
  lastWebhook: string | null;
  pagesTracked: { tasks: number; projects: number; areas: number };
  totalEvents: number;
}
```

Returned by `GET /api/status`. Provides sync health at a glance.

## SyncEvent

```typescript
interface SyncEvent {
  id: number;
  event_type: string;
  source: string;
  payload: string | null;
  created_at: string;
}
```

Audit log entries. `event_type` values: `full_sync`, `reconciliation`, `webhook`, `webhook_verification`, `error`. `source` values: `startup`, `scheduled`, `notion_webhook`, `manual_sync`.

## WebhookStatus

```typescript
interface WebhookStatus {
  webhookUrl: string | null;
  verified: boolean;
  verificationToken: string | null;
}
```

Used by the Settings page to show webhook configuration state.
