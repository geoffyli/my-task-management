# Database Schemas

Property schemas for all databases in Geoff's task management system.
IDs are in the registry table in `SKILL.md`.

---

## Tasks

Most agent operations target this database.

| Property | Type | Values / Notes |
|---|---|---|
| `Task Name` | title | Free text — the task title |
| `Status` | select | `Not Started` · `In Progress` · `Done` |
| `Priority` | select | `High` · `Medium` · `Low` |
| `Project` | relation → Projects | Which project(s) this task belongs to |
| `Assigned Date` | date | The day this task is scheduled to be worked on. The Today page filters on `Assigned Date = today`. |
| `Initial Assigned Date` | date | Records the *first* value of `Assigned Date`. Set automatically by an automation script. **Never overwrite once set** — it is an immutable audit field. Set it only when creating a task with an `Assigned Date` and it is currently null. |
| `Deadline` | date | Hard deadline. Optional — not all tasks have one. |
| `Depends on` | relation → Tasks (self) | Tasks that must complete before this one can start. Bi-directional with `Prepares for`. |
| `Prepares for` | relation → Tasks (self) | Tasks this task unlocks. Mirror of `Depends on` on the counterpart. |
| `Related Tasks` | relation → Tasks (self) | Loosely related tasks — no dependency semantics. |
| `Formula` | formula | Computed display string — read-only, cannot be written. |

**Task page sections** (verified block structure):
1. `heading_2` **"Steps & Updates"** — contains `to_do` blocks (checkboxes). Append new `to_do` items here to record progress steps. Sub-steps can be nested under a parent `to_do`.
2. `heading_2` **"Overview"** — freeform: resources, links, code snippets, sub-pages. May be empty.

---

## Projects

| Property | Type | Values / Notes |
|---|---|---|
| `Name` | title | Project title |
| `Status` | select | `In Progress` · `Completed` |
| `Priority` | select | `High` · `Medium` · `Low` |
| `Areas` | relation → Areas | Which area(s) this project belongs to |
| `Date` | date | Start and/or end date. Optional. |
| `Tags` | multi_select | Free-form tags. Rarely used — do not add unless requested. |

**Project page sections** (verified block structure):
1. `heading_2` **"Tasks"** — followed by an embedded `child_database` view filtered to this project's tasks. This view **cannot be created via API** (see `references/page-layouts.md`).
2. `heading_2` **"Goals"** — freeform goal descriptions.
3. `heading_2` **"Resources"** — links, references, sub-pages, supporting material.

---

## Areas

| Property | Type | Values / Notes |
|---|---|---|
| `Area Name` | title | Area name |
| `Projects` | relation → Projects | Projects under this area (auto-populated via relation) |

**All 7 areas (with page IDs):**

| Area | Page ID |
|---|---|
| Health & Fitness | `254414c3-2bf8-808e-82f8-cf17ab091aa8` |
| Academics | `254414c3-2bf8-8094-9d40-ef57c3234b99` |
| Productivity | `254414c3-2bf8-80bb-a514-c4779d9181fb` |
| Career | `255414c3-2bf8-8086-95a0-d718c81897c4` |
| Tech | `29a414c3-2bf8-80bd-8fe2-d2aea195bb1b` |
| Investment and Wealth Management | `2a7414c3-2bf8-80cc-a2d0-fb840f4cbe4f` |
| Insights and Perspectives | `2f1414c3-2bf8-8077-b7dc-f04868516cd6` |

Area pages have **no body content** (verified: all pages return 0 blocks). They are purely property-based containers.

---

## Repetitive Tasks Configuration

Managed by automation scripts. Do not create or modify entries unless explicitly asked.

| Property | Type | Values / Notes |
|---|---|---|
| `Name` | title | Name of the recurring task pattern |
| `Mode` | select | `Cron` (only mode in use) |
| `Value` | rich_text | Cron expression (e.g., `0 0 * * 6` = every Saturday midnight) |
| `Date Range` | date | Start and end date for the active period |
| `Priority` | select | Priority for generated tasks |
| `Projects` | relation → Projects | Projects the generated tasks are linked to |

---

## Weekly Notes

One entry per week. The Today page embeds a filtered view showing the current week's note. Read-only for agents unless the user requests an update.
