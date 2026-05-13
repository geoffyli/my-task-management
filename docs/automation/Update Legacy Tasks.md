---
parent: "[[Automation]]"
tags:
related:
  - "[[Create Repetitive Tasks]]"
  - "[[Setting Up Triggers]]"
---

# Update Legacy Tasks

> **Status: DISABLED (2026-05-06)**
> This script has been retired in favor of a view-based filtering approach. The Notion "Today" view now uses `Assigned Date ≤ today AND Status not in {Done, Blocked, Cancelled}` to surface relevant tasks without mutating data. The script and schedule remain in the codebase for reference but do not run.

## Why It Was Retired

The nightly date-rollover approach had several drawbacks:
- **Destroyed intermediate scheduling history** — only the initial and current dates were preserved
- **Inflated reschedule metrics** — passive neglect was indistinguishable from intentional deferral
- **Polluted Notion page history** — synthetic edits every night made manual auditing difficult
- **Unnecessary API/webhook churn** — N+1 API calls per night, each triggering a webhook that short-circuited

The replacement (a Notion database view filter) achieves the same UX with zero automation cost and preserves full scheduling history for analytics.

---

## Original Purpose

Rolled forward the "Assigned Date" of overdue tasks to today. Any task with an "Assigned Date" on or before yesterday that was not Done, Blocked, or Cancelled got its date updated to today's date.

## Schedule (Disabled)

- **Trigger:** Schedule
- **Cron:** `0 0 0 * * *` (daily at midnight)
- **Timezone:** Asia/Shanghai (CST, UTC+8)
- **Enabled:** false
- **File:** `update_legacy_tasks_schedule.schedule.yaml`

## How It Worked

1. **Determine today and yesterday** in CST.
2. **Query the Tasks database** for all pages where:
   - "Assigned Date" is on or before yesterday
   - Status is NOT "Blocked"
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
