---
parent: "[[Automation]]"
tags:
related:
  - "[[Update Legacy Tasks]]"
  - "[[Setting Up Triggers]]"
---

# Create Repetitive Tasks

## Purpose

Reads a configuration database in Notion and creates task entries in the Tasks database based on cron expressions or day-interval patterns. This automates recurring task creation (e.g., daily reviews, weekly reports) without manual entry.

## When It Runs

- **Trigger:** Schedule
- **Cron:** `0 0 0 * * *` (daily at midnight)
- **Timezone:** Asia/Shanghai (CST, UTC+8)
- **File:** `create_repetitive_tasks_schedule.schedule.yaml`

## How It Works

1. **Determine today's date** in CST (UTC+8, no DST).
2. **Query the config database** for all entries with a valid Mode ("Cron" or "Interval") and Value.
3. **For each config entry:**
   - Check if today falls within the configured Date Range (skip if outside).
   - **Cron mode:** Parse the cron expression, validate the interval is at least 1 day, and check if the cron would have fired today.
   - **Interval mode:** Find the most recent task with the same name in the Tasks database, calculate the day gap, and check if the interval has elapsed.
4. **Duplicate check:** Before creating, query the Tasks database for an existing task with the same name and today's date. Skip if found.
5. **Template support:** Look for a "Template" heading (h2) in the config page's content. If found, copy its child blocks into the new task page body.
6. **Create the task** in the Tasks database with properties: Task Name (prefixed `[Repetitive]`), Assigned Date (today), Status ("Not Started"), Importance (if configured), Urgency (if configured), and Project relations (if configured).

## Configuration

| Parameter | Source | Value |
|-----------|--------|-------|
| `notion` | Windmill resource | `$res:f/notion/api` |
| `config_database_id` | Schedule args | `2f2414c3-2bf8-800f-9657-f703a55f4cd3` |
| `tasks_database_id` | Schedule args | `a43c2d3d-11e5-4a66-be42-dd411a1d9727` |

### Config Database Schema

Each row in the config database represents a repetitive task definition:

| Property | Type | Description |
|----------|------|-------------|
| Name | Title | The task name (used in the created task as `[Repetitive] <Name>`) |
| Mode | Select | Either "Cron" or "Interval" |
| Value | Rich Text | Cron expression (5-field standard) or interval in days |
| Date Range | Date | Optional start/end bounds for when this task should be active |
| Importance | Select | Optional importance to assign to created tasks |
| Urgency | Select | Optional urgency to assign to created tasks |
| Projects | Relation | Optional project relations to assign |

## Key Functions

| Function | Role |
|----------|------|
| `main` | Entry point; orchestrates config fetching, evaluation, and task creation |
| `extractConfigEntry` | Parses a Notion page into a typed `RepetitiveTaskConfig` |
| `shouldCronTriggerToday` | Evaluates whether a cron expression fires on today's date |
| `shouldCreateIntervalTask` | Checks if enough days have elapsed since the last task |
| `validateCronInterval` | Rejects cron expressions that fire more than once per day |
| `findTemplateBlocks` | Searches config page content for a "Template" h2 and extracts child blocks |
| `fetchBlockChildren` | Recursively fetches and sanitizes Notion block trees (up to 3 levels deep) |
| `sanitizeBlock` / `sanitizeRichTextItem` | Cleans Notion API response blocks into a format suitable for page creation |
| `buildTaskProperties` | Constructs the Notion page properties object for a new task |

## Return Value

```json
{
  "execution_date": "2026-05-02",
  "configs_found": 5,
  "tasks_created": 2,
  "tasks_with_template": 1,
  "skipped": 3,
  "failed": 0
}
```
