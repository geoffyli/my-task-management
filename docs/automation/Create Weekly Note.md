---
parent: "[[Automation]]"
tags:
related:
  - "[[Create Repetitive Tasks]]"
  - "[[Setting Up Triggers]]"
---

# Create Weekly Note

## Purpose

Creates a weekly planning note in the Weekly Notes database every Monday. The note contains a bulleted list of all 7 days in the week (Monday through Sunday) with empty child paragraphs for daily entries.

## When It Runs

- **Trigger:** Schedule
- **Cron:** `0 0 0 * * 1` (every Monday at midnight)
- **Timezone:** Asia/Shanghai (CST, UTC+8)
- **File:** `create_weekly_note_schedule.schedule.yaml`

## How It Works

1. **Determine the current week's Monday** in CST.
2. **Generate 7 dates** from Monday through Sunday.
3. **Format the page name** using ISO week numbering (e.g., "2026 W18").
4. **Check for duplicates** by querying the Weekly Notes database for an existing entry with the same start date. Skip if found.
5. **Create the page** with:
   - **Name:** ISO week identifier (e.g., "2026 W18")
   - **Date:** Range from Monday to Sunday
   - **Body:** A bulleted list item for each day (formatted as ISO date strings), each with an empty paragraph child for notes.

## Configuration

| Parameter | Source | Value |
|-----------|--------|-------|
| `notion` | Windmill resource | `$res:f/notion/api` |
| `weekly_notes_database_id` | Schedule args | `278414c3-2bf8-8037-901c-cd198456a7a9` |

## Key Functions

| Function | Role |
|----------|------|
| `main` | Entry point; checks for existing note, creates if absent |
| `getCurrentWeekMonday` | Calculates the Monday of the current ISO week in CST |
| `formatWeeklyNoteName` | Produces the "YYYY WXX" string from an ISO week number |
| `getISOWeekNumber` | Computes the ISO 8601 week number for a given date |
| `getISOWeekYear` | Determines the ISO week year (may differ from calendar year at year boundaries) |
| `buildWeeklyNoteBlocks` | Generates the page body: 7 bulleted list items plus a trailing empty paragraph |
| `getDataSourceId` | Resolves the Notion v5 SDK data source ID from a database ID |

## Return Value

On creation:

```json
{
  "action": "created",
  "page_id": "abc123",
  "page_name": "2026 W18",
  "start_date": "2026-04-27",
  "end_date": "2026-05-03"
}
```

If already exists:

```json
{
  "action": "skipped_existing",
  "page_name": "2026 W18",
  "start_date": "2026-04-27"
}
```
