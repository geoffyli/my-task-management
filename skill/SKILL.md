---
name: personal-task-management
description: Geoff's personal task management system spanning Notion and Google Calendar. Load this skill whenever a task involves reading, creating, or updating tasks, projects, or areas in his Notion workspace; setting, checking, or managing calendar reminders; or cross-referencing his calendar with his Notion tasks.
metadata:
---

# Personal Task Management

This skill gives agents everything needed to operate on Geoff's task management system without discovery overhead. Load the `notion` skill alongside this one for generic Notion API mechanics (auth, endpoint syntax, property formats).

> **Safety rule — always in force:**
> Never perform destructive operations (deleting pages, removing properties, bulk-archiving, clearing database content) unless the user explicitly requests it. Prefer non-destructive updates (status changes, date updates, appending content) in all cases.

---

## Action Protocol — Confirmation Before Write Operations

Before performing ANY write operation (create, update, delete) on external systems (Notion, Google Calendar, or any future integrations), the agent **MUST stop and confirm** the action with the user. Read operations do not require confirmation.

### Operation Classification

| Operation Type | Examples | Confirmation Required |
|---|---|---|
| **Read** | Query tasks, list projects, fetch calendar events, read page content | **No** |
| **Write — Create** | Create task, create project, create area, create calendar event | **Yes** |
| **Write — Update** | Change status, reschedule task, update priority, modify event | **Yes** (except trivial) |
| **Write — Delete** | Archive page, cancel event, remove relation, clear field value | **Yes** |

### Trivial Updates (Bypass Allowed)

The following updates are considered **trivial** and may proceed without explicit confirmation:
- Marking a task as `Done` when the user has clearly indicated completion
- Marking a to-do checkbox as complete when the user confirms the step is done
- Minor typo corrections in titles when immediately following a creation the user approved

For any ambiguous case, default to requesting confirmation.

### Standard Confirmation Format (Detailed)

Before executing a write operation, present ALL relevant details:

```
**Action**: [Create/Update/Delete] [entity type] in [system]
**Target**: [Page/event name or ID if updating existing]
**Details**:
- [Field 1]: [Value]
- [Field 2]: [Value]
- ...

Confirm?
```

**Example — Creating a Task:**
> **Action**: Create a new task in Notion  
> **Target**: Tasks database  
> **Details**:
> - Task Name: "Review Q1 report"
> - Status: Not Started
> - Priority: Medium
> - Assigned Date: 2026-03-05
> - Project: Quarterly Planning
>
> Confirm?

**Example — Updating a Task:**
> **Action**: Update task in Notion  
> **Target**: "Review Q1 report" (ID: abc123...)  
> **Details**:
> - Status: Not Started → In Progress
> - Assigned Date: 2026-03-05 → 2026-03-07
>
> Confirm?

**Example — Creating a Calendar Reminder:**
> **Action**: Create calendar reminder in Google Calendar  
> **Target**: Primary calendar  
> **Details**:
> - Title: "Submit expense report"
> - Date/Time: 2026-03-10 at 09:00 (UTC+8)
> - Reminders: 1 day before, 1 hour before
> - Notes: (none)
>
> Confirm?

### Batch Operations

For operations affecting multiple items (e.g., rescheduling 5 tasks, creating 3 reminders), present a **single consolidated confirmation**:

```
**Action**: [Batch operation description]
**Target**: [Number] items in [system]
**Details**:
1. [Item 1]: [Key changes]
2. [Item 2]: [Key changes]
3. ...

Confirm all?
```

### After Confirmation

- On **"yes" / "confirm" / approval**: Proceed with the operation(s)
- On **"no" / rejection**: Abort and ask what the user would like to change
- On **modification request**: Adjust the plan and re-present for confirmation

---

## System Overview

Geoff uses a **PARA-inspired hierarchy** in Notion:

```
Areas  ──(1:N)──▶  Projects  ──(1:N)──▶  Tasks
```

- **Areas** — broad life domains, rarely edited, no body content.
- **Projects** — goal-oriented efforts under one or more areas. Each project page has a Tasks view, Goals, and Resources section.
- **Tasks** — the primary unit of work. Most agent operations target this database. Tasks optionally carry a `Type` tag for growth tracking (see schemas).

A **Today** page (`253414c3-2bf8-8083-9e01-c4da653037e3`) acts as the daily dashboard: it shows tasks with `Assigned Date = today` grouped by status, and the current week's Weekly Note.

**Google Calendar** (`primary` calendar, account `geoff.yulong.li@gmail.com`) is used as a **reminder system** — not for scheduling meetings. Typical reminder events are single-action to-dos (cancel a subscription, send a message, pay a bill, submit an assignment) with a popup notification set to fire ahead of the event. Reminders are not synced to Notion; the two systems are independent. See `references/operations.md` for how to read and create reminders.

---

## Database Registry

> For Notion API auth and endpoint syntax, see the `notion` skill.

| Database | `data_source_id` (query) | `database_id` (create pages) |
|---|---|---|
| **Tasks** | `46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe` | `a43c2d3d-11e5-4a66-be42-dd411a1d9727` |
| **Projects** | `81899362-e971-4a82-ba25-18fdda1d8f63` | `8ff49260-77c2-4fc7-8727-c822af980aa1` |
| **Areas** | `0b036eaf-a357-46ec-b479-b6bb88497b74` | `7b5e343e-0306-4ee1-babd-26202e51bf4d` |
| **Weekly Notes** | `278414c3-2bf8-8033-bc6c-000bc60342f8` | — |
| **Repetitive Tasks Config** | `2f2414c3-2bf8-80ca-8bca-000ba588fe78` | — |
| **Pieces** | `2e2414c3-2bf8-8016-b408-000be3647489` | — |
| **Sources** | `2e7414c3-2bf8-80b9-a573-000bd0673544` | — |
| **Threads** | `2e7414c3-2bf8-805b-bd26-000b0bf157be` | — |
| **Incidents** | `298414c3-2bf8-806c-86d9-000bd5a5d627` | — |

**Two IDs per database:** use `database_id` when creating pages (`parent`), use `data_source_id` when querying (`POST /v1/data_sources/{id}/query`).

---

## Creation Template Rule

The Notion API cannot apply database templates — template pages are invisible to the API. **Always use the two-step pattern** when creating a Task or Project:

| Database | Step 1 | Step 2 — blocks to append |
|---|---|---|
| **Tasks** | `POST /v1/pages` with properties | `heading_2` "Steps & Updates", `paragraph`, `heading_2` "Overview", `paragraph` |
| **Projects** | `POST /v1/pages` with properties | `heading_2` "Tasks", placeholder `paragraph`, `heading_2` "Goals", `paragraph`, `heading_2` "Resources", `paragraph` — then **notify user** to add the Tasks linked view in Notion UI |
| **Areas** | `POST /v1/pages` with properties | None — area pages have no body content |

See `references/operations.md` for complete curl examples.

---

## Reference Files

| File | Contents |
|---|---|
| `references/schemas.md` | Full property schemas for Tasks, Projects, Areas, Repetitive Tasks Config, Weekly Notes |
| `references/page-layouts.md` | Verified block-level layouts: Today page, task page, project page, area page |
| `references/operations.md` | All read/write operations: tasks, projects, areas, Google Calendar reminders, dependencies |
| `references/rules.md` | Full behavioural rules: creation, data integrity, safety |
