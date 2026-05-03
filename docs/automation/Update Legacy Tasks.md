---
parent: "[[Automation]]"
tags:
related:
  - "[[Set Task Init Date]]"
  - "[[Create Repetitive Tasks]]"
  - "[[Setting Up Triggers]]"
---

# Update Legacy Tasks

## Purpose

Rolls forward the "Assigned Date" of overdue tasks to today. Any task with an "Assigned Date" on or before yesterday that is not Done, Deferred, or Cancelled gets its date updated to today's date. This ensures the daily task list always reflects the current backlog without manual date adjustments.

## When It Runs

- **Trigger:** Schedule
- **Cron:** `0 0 0 * * *` (daily at midnight)
- **Timezone:** Asia/Shanghai (CST, UTC+8)
- **File:** `update_legacy_tasks_schedule.schedule.yaml`

## How It Works

1. **Determine today and yesterday** in CST.
2. **Query the Tasks database** for all pages where:
   - "Assigned Date" is on or before yesterday
   - Status is NOT "Deferred"
   - Status is NOT "Done"
   - Status is NOT "Cancelled"
3. **Paginate** through all results (100 per page) to collect the full set.
4. **For each legacy task:** Update "Assigned Date" to today's date.
5. **Report** the total found, updated, and failed counts.

## Configuration

| Parameter | Source | Value |
|-----------|--------|-------|
| `notion` | Windmill resource | `$res:f/notion/api` |
| `tasks_database_id` | Schedule args | `a43c2d3d-11e5-4a66-be42-dd411a1d9727` |

## Interaction with Set Task Init Date

When this script updates a task's "Assigned Date", it triggers the Notion webhook that fires [[Set Task Init Date]]. However, because the task already has an "Initial Assigned Date" recorded (set when it was first scheduled), the webhook handler takes no action. The original scheduling date is preserved.

## Key Functions

| Function | Role |
|----------|------|
| `main` | Entry point; queries legacy tasks and updates each one |
| `queryAllLegacyTasks` | Paginates through the Tasks database with the filter criteria |
| `extractTask` | Parses a Notion page into a typed `LegacyTask` object |
| `getDateInCST` | Returns today's date (or offset) formatted as ISO date string in CST |

## Return Value

```json
{
  "tasks_found": 12,
  "tasks_updated": 12,
  "tasks_failed": 0,
  "execution_date": "2026-05-02",
  "timezone": "Asia/Shanghai"
}
```
