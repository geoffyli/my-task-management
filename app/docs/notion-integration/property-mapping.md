---
parent: "[[notion-moc]]"
tags:
  - notion
  - mapping
  - properties
  - schema
related:
  - "[[database-schema]]"
  - "[[database-operations]]"
  - "[[data-sources]]"
  - "[[types-reference]]"
---

# Notion Property Mapping

Defines how Notion database properties are extracted and stored in SQLite columns.

**Source:** `server/db/store.ts` — extraction functions and core key definitions.

## Extraction Functions

| Function | Input (Notion type) | Output |
|----------|-------------------|--------|
| `extractTitle(prop)` | title property | First `plain_text` segment, or `"(untitled)"` |
| `extractSelect(prop)` | select property | `select.name` string, or `null` |
| `extractDate(prop)` | date property | `date.start` ISO string, or `null` |
| `extractRelationIds(prop)` | relation property | Array of page ID strings |
| `extractProperties(props, coreKeys)` | all properties | JSON string of non-core properties |

## Tasks Database

Notion property name → SQLite column in `tasks` table.

| Notion Property | Type | SQLite Column | Notes |
|----------------|------|---------------|-------|
| Task Name | title | `title` | Falls back to "(untitled)" |
| Status | select | `status` | Values: Not Started, In Progress, Done, Cancelled, Deferred. Default: "Not Started" |
| Importance | select | `importance` | Values: High, Medium, Low. Default: "Medium" |
| Urgency | select | `urgency` | Values: High, Medium, Low. Default: "Medium" |
| Assigned Date | date | `assigned_date` | Current scheduled date (may differ from initial) |
| Initial Assigned Date | date | `initial_assigned_date` | Original assignment date for reschedule tracking |
| Deadline | date | `deadline` | Hard due date |
| Project | relation | `project_ids` | JSON-stringified array of project page IDs |
| Depends on | relation | `dependencies` | JSON-stringified array of blocking task IDs |
| *(all others)* | various | `properties` | JSON blob of remaining properties |

**Derived fields:**
- `completion_date` = `assigned_date` when `status === "Done"`, otherwise `null`
- `created_time` = Notion's `raw.created_time`
- `last_edited_time` = Notion's `raw.last_edited_time`



## Projects Database

| Notion Property | Type | SQLite Column | Notes |
|----------------|------|---------------|-------|
| Name | title | `title` | Project name |
| Status | select | `status` | Values: In Progress, Completed. Default: "In Progress" |
| Priority | select | `priority` | Values: High, Medium, Low. Default: "Medium" |
| Areas | relation | `area_ids` | JSON-stringified array of area page IDs |
| Date | date (range) | `start_date`, `end_date` | `.date.start` and `.date.end` respectively |
| *(all others)* | various | `properties` | JSON blob |

## Areas Database

| Notion Property | Type | SQLite Column | Notes |
|----------------|------|---------------|-------|
| Area Name | title | `title` | Area name |
| *(all others)* | various | `properties` | JSON blob |

## Core Keys

Properties listed as "core keys" are extracted into dedicated columns. Everything else goes into the `properties` JSON column.

```typescript
TASK_CORE_KEYS = [
  "Task Name", "Status", "Importance", "Urgency", "Project",
  "Assigned Date", "Initial Assigned Date", "Deadline", "Depends on",
];

PROJECT_CORE_KEYS = ["Name", "Status", "Priority", "Areas", "Date"];

AREA_CORE_KEYS = ["Area Name"];
```

## Raw JSON Preservation

The full Notion page response is always stored in `pages.raw_json`. This enables re-extraction if the schema evolves — for example, adding a new core key only requires updating the extraction logic and running a re-sync, without losing historical data.

## Relation Truncation

Notion limits relation properties to ~100 items per API response. The `checkRelationTruncation()` function logs a warning when `has_more: true` is detected on a relation property, indicating potentially incomplete data.
