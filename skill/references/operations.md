# Operations

Curl snippets for all read and write operations. All requests require:

```bash
NOTION_KEY=$(cat ~/.config/notion/api_key)
# Headers: Authorization: Bearer $NOTION_KEY
#          Notion-Version: 2025-09-03
#          Content-Type: application/json  (POST/PATCH only)
```

---

## Tasks

> **Write operations in this section require confirmation.** See Action Protocol in `SKILL.md`.

### Read today's tasks

```bash
TODAY=$(date +%Y-%m-%d)

curl -s -X POST "https://api.notion.com/v1/data_sources/46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d "{
    \"filter\": {\"property\": \"Assigned Date\", \"date\": {\"equals\": \"$TODAY\"}},
    \"sorts\":  [{\"property\": \"Status\", \"direction\": \"ascending\"}]
  }"
```

### Read active tasks (not done, any date)

```bash
curl -s -X POST "https://api.notion.com/v1/data_sources/46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Status", "select": {"does_not_equal": "Done"}},
    "sorts":  [{"property": "Assigned Date", "direction": "ascending"}]
  }'
```

### Read tasks for a specific project

```bash
# PROJECT_PAGE_ID = the target project's page ID
curl -s -X POST "https://api.notion.com/v1/data_sources/46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"property": "Project", "relation": {"contains": "PROJECT_PAGE_ID"}}}'
```

### Create a task — two-step pattern

> The Notion API cannot apply database templates. Always perform both steps.

**Step 1a — task with no assigned date** (equivalent to "Add Task"):
```bash
# Optional — only include "Type" if the user specifies a growth category:
# "Type": {"select": {"name": "Build"}}
NEW_PAGE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "a43c2d3d-11e5-4a66-be42-dd411a1d9727"},
    "properties": {
      "Task Name": {"title": [{"text": {"content": "Task title here"}}]},
      "Status":    {"select": {"name": "Not Started"}},
      "Priority":  {"select": {"name": "Medium"}}
    }
  }')
TASK_PAGE_ID=$(echo "$NEW_PAGE" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

**Step 1b — task assigned to today** (equivalent to "Add Daily Task"):
```bash
# Optional — only include "Type" if the user specifies a growth category:
# "Type": {"select": {"name": "Build"}}
TODAY=$(date +%Y-%m-%d)
NEW_PAGE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent\": {\"database_id\": \"a43c2d3d-11e5-4a66-be42-dd411a1d9727\"},
    \"properties\": {
      \"Task Name\":             {\"title\": [{\"text\": {\"content\": \"Task title here\"}}]},
      \"Status\":                {\"select\": {\"name\": \"Not Started\"}},
      \"Priority\":              {\"select\": {\"name\": \"Medium\"}},
      \"Assigned Date\":         {\"date\": {\"start\": \"$TODAY\"}},
      \"Initial Assigned Date\": {\"date\": {\"start\": \"$TODAY\"}}
    }
  }")
TASK_PAGE_ID=$(echo "$NEW_PAGE" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

> When setting `Assigned Date`, always also set `Initial Assigned Date` to the same value — but only if `Initial Assigned Date` is currently null. Never overwrite it once set.

**Step 2 — append standard template body** (run immediately after Step 1):
```bash
curl -s -X PATCH "https://api.notion.com/v1/blocks/$TASK_PAGE_ID/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {"object":"block","type":"heading_2",
       "heading_2":{"rich_text":[{"type":"text","text":{"content":"Steps & Updates"}}]}},
      {"object":"block","type":"paragraph",
       "paragraph":{"rich_text":[]}},
      {"object":"block","type":"heading_2",
       "heading_2":{"rich_text":[{"type":"text","text":{"content":"Overview"}}]}},
      {"object":"block","type":"paragraph",
       "paragraph":{"rich_text":[]}}
    ]
  }'
```

### Update task status

```bash
# Valid values: "Not Started" | "In Progress" | "Done" | "Deferred" | "Cancelled"
curl -s -X PATCH "https://api.notion.com/v1/pages/TASK_PAGE_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Status": {"select": {"name": "In Progress"}}}}'
```

### Reschedule a task (change Assigned Date only)

```bash
# Only update Assigned Date — do NOT touch Initial Assigned Date
curl -s -X PATCH "https://api.notion.com/v1/pages/TASK_PAGE_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Assigned Date": {"date": {"start": "2026-03-05"}}}}'
```

### Assign a task to a project

```bash
curl -s -X PATCH "https://api.notion.com/v1/pages/TASK_PAGE_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Project": {"relation": [{"id": "PROJECT_PAGE_ID"}]}}}'
```

### Append a step to "Steps & Updates"

The API appends to the end of the page. For new/empty tasks this lands correctly. For tasks with existing content, fetch the page blocks first to verify placement if needed.

```bash
curl -s -X PATCH "https://api.notion.com/v1/blocks/TASK_PAGE_ID/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [{
      "object": "block", "type": "to_do",
      "to_do": {
        "rich_text": [{"type": "text", "text": {"content": "Step description"}}],
        "checked": false
      }
    }]
  }'
```

### Mark a step as complete

```bash
# BLOCK_ID = the to_do block's ID (get it from GET /v1/blocks/TASK_PAGE_ID/children)
curl -s -X PATCH "https://api.notion.com/v1/blocks/BLOCK_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"to_do": {"checked": true}}'
```

### Link task dependencies

`Depends on` and `Prepares for` are bi-directional mirrors. Notion does not auto-propagate relation inverses via API — always patch **both sides** explicitly.

```bash
# Task A depends on Task B:
# 1. Patch Task A's "Depends on"
curl -s -X PATCH "https://api.notion.com/v1/pages/TASK_A_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Depends on": {"relation": [{"id": "TASK_B_ID"}]}}}'

# 2. Patch Task B's "Prepares for"
curl -s -X PATCH "https://api.notion.com/v1/pages/TASK_B_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Prepares for": {"relation": [{"id": "TASK_A_ID"}]}}}'
```

---

## Projects

> **Write operations in this section require confirmation.** See Action Protocol in `SKILL.md`.

### Read active projects

```bash
curl -s -X POST "https://api.notion.com/v1/data_sources/81899362-e971-4a82-ba25-18fdda1d8f63/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"property": "Status", "select": {"equals": "In Progress"}}}'
```

### Create a project — two-step pattern

**Step 1 — create page with properties:**
```bash
NEW_PAGE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "8ff49260-77c2-4fc7-8727-c822af980aa1"},
    "properties": {
      "Name":     {"title": [{"text": {"content": "Project name here"}}]},
      "Status":   {"select": {"name": "In Progress"}},
      "Priority": {"select": {"name": "Medium"}},
      "Areas":    {"relation": [{"id": "AREA_PAGE_ID"}]}
    }
  }')
PROJECT_PAGE_ID=$(echo "$NEW_PAGE" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

Use an area page ID from the table in `references/schemas.md`. Omit `Areas` if unknown — it can be patched later.

**Step 2 — append standard template body:**
```bash
curl -s -X PATCH "https://api.notion.com/v1/blocks/$PROJECT_PAGE_ID/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {"object":"block","type":"heading_2",
       "heading_2":{"rich_text":[{"type":"text","text":{"content":"Tasks"}}]}},
      {"object":"block","type":"paragraph",
       "paragraph":{"rich_text":[{"type":"text","text":{"content":"⚠️ Add a linked Tasks view filtered to this project here (Notion UI only)."}}]}},
      {"object":"block","type":"heading_2",
       "heading_2":{"rich_text":[{"type":"text","text":{"content":"Goals"}}]}},
      {"object":"block","type":"paragraph",
       "paragraph":{"rich_text":[]}},
      {"object":"block","type":"heading_2",
       "heading_2":{"rich_text":[{"type":"text","text":{"content":"Resources"}}]}},
      {"object":"block","type":"paragraph",
       "paragraph":{"rich_text":[]}}
    ]
  }'
```

> After creating a project via API, notify the user that they need to manually add the filtered Tasks linked view under the "Tasks" heading in the Notion UI. The API cannot replicate this filtered inline database view.

### Update project status

```bash
# Valid values: "In Progress" | "Completed"
curl -s -X PATCH "https://api.notion.com/v1/pages/PROJECT_PAGE_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Status": {"select": {"name": "Completed"}}}}'
```

---

## Areas

> **Write operations in this section require confirmation.** See Action Protocol in `SKILL.md`.

### Read all areas

```bash
curl -s -X POST "https://api.notion.com/v1/data_sources/0b036eaf-a357-46ec-b479-b6bb88497b74/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Create an area — single step

> Area pages have no body content. One API call is sufficient. Creating new areas is rare — check the 7 existing areas first.

```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "7b5e343e-0306-4ee1-babd-26202e51bf4d"},
    "properties": {
      "Area Name": {"title": [{"text": {"content": "Area name here"}}]}
    }
  }'
```

---

## Weekly Notes

### Read the current week's note

```bash
WEEK_START=$(python3 -c "
from datetime import date, timedelta
today = date.today()
monday = today - timedelta(days=today.weekday())
print(monday.isoformat())
")

curl -s -X POST "https://api.notion.com/v1/data_sources/278414c3-2bf8-8033-bc6c-000bc60342f8/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d "{\"filter\": {\"property\": \"Date\", \"date\": {\"equals\": \"$WEEK_START\"}}}"
```

---

## General

### Read page blocks (content of any page)

```bash
curl -s "https://api.notion.com/v1/blocks/PAGE_ID/children?page_size=50" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03"
```

---

## Google Calendar — Reminders

> **Write operations in this section require confirmation.** See Action Protocol in `SKILL.md`.

Google Calendar is used as a **reminder system** — not for scheduling meetings. All reminder events live in the `primary` calendar. Ensure `gws` auth is valid before running calendar commands.

```bash
gws auth status
```

### Reminder event structure (observed from live data)

| Field | Notes |
|---|---|
| `summary` | Short action title (e.g., "Cancel Cleanup subscription", "Submit assignment") |
| `start.dateTime` | RFC3339 with UTC+8 offset, e.g., `2026-03-05T10:00:00+08:00` |
| `end.dateTime` | Typically 1 hour after start — duration is not semantically important for reminders |
| `description` | Usually empty. May contain side notes, links, or related info |
| `reminders` | `overrides: [{method:"popup", minutes:N}]`. `useDefault:true` on imported/recurring events |

**Common reminder lead times observed:**

| `overrides.minutes` value | Fires before event |
|---|---|
| `0` | At event time |
| `5` | 5 minutes before |
| `15` | 15 minutes before |
| `30` | 30 minutes before |
| `60` | 1 hour before |
| `120` | 2 hours before |
| `1440` | 1 day before |
| `2880` | 2 days before |
| `4320` | 3 days before |

Set multiple reminder overrides by adding multiple objects in `reminders.overrides`.

---

### Read upcoming reminders

```bash
# Next 7 days (replace with your current window)
gws calendar events list --params '{"calendarId":"primary","timeMin":"2026-03-05T00:00:00+08:00","timeMax":"2026-03-12T23:59:59+08:00","singleEvents":true,"orderBy":"startTime"}'

# Specific date range
gws calendar events list --params '{"calendarId":"primary","timeMin":"2026-03-05T00:00:00+08:00","timeMax":"2026-03-10T23:59:59+08:00","singleEvents":true,"orderBy":"startTime"}'
```

---

### Create a reminder — confirmation required

> **STOP before creating.** Always confirm the following details with the user before running `gws calendar events insert`:
>
> 1. **Title** — the event summary
> 2. **Date and time** — exact datetime (and timezone if ambiguous; default UTC+8)
> 3. **Reminder(s)** — when to be notified (e.g., "30 minutes before", "1 day before")
> 4. **Notes** — any description/side notes to attach (may be empty)
>
> Present a summary like: *"I'll create a reminder titled '[title]' on [date] at [time], with a popup [N] before. Notes: '[notes]'. Confirm?"* — then wait for explicit approval before proceeding.

```bash
# Single reminder — 30 minutes before
gws calendar events insert \
  --params '{"calendarId":"primary"}' \
  --json '{"summary":"Title here","start":{"dateTime":"2026-03-05T10:00:00+08:00"},"end":{"dateTime":"2026-03-05T11:00:00+08:00"},"description":"Optional notes or links here","reminders":{"useDefault":false,"overrides":[{"method":"popup","minutes":30}]}}'

# Multiple reminders — e.g., 3 days and 1 hour before
gws calendar events insert \
  --params '{"calendarId":"primary"}' \
  --json '{"summary":"Title here","start":{"dateTime":"2026-03-10T09:00:00+08:00"},"end":{"dateTime":"2026-03-10T10:00:00+08:00"},"description":"Optional notes","reminders":{"useDefault":false,"overrides":[{"method":"popup","minutes":4320},{"method":"popup","minutes":60}]}}'
```

---

### Update a reminder

```bash
# EVENT_ID from the events list output
gws calendar events patch \
  --params '{"calendarId":"primary","eventId":"EVENT_ID"}' \
  --json '{"summary":"Updated title","start":{"dateTime":"2026-03-06T10:00:00+08:00"},"end":{"dateTime":"2026-03-06T11:00:00+08:00"},"description":"Updated notes","reminders":{"useDefault":false,"overrides":[{"method":"popup","minutes":1440}]}}'
```

> Updating a calendar event is a write operation — confirm changed fields with the user before running.
