# Database Schemas

Property schemas for all databases in Geoff's task management system.
IDs are in the registry table in `SKILL.md`.

---

## Tasks

Most agent operations target this database.

| Property | Type | Values / Notes |
|---|---|---|
| `Task Name` | title | Free text — the task title |
| `Status` | select | `Not Started` · `In Progress` · `Done` · `Blocked` · `Cancelled` |
| `Importance` | select | `High` · `Medium` · `Low` |
| `Urgency` | select | `High` · `Medium` · `Low` · `Overdue` — **optional**. Indicates time-sensitivity. Leave empty if the task has no time pressure beyond its assigned date. Use `Overdue` when the task is past its deadline. |
| `Type` | select | `Plan` · `Reflect` · `Explore` · `Learn` · `Maintain` · `Build` · `Fitness` · `Health` — **optional**. Marks growth-oriented tasks. Leave empty for obligation tasks (work, academic, routine). See usage convention below. |
| `Project` | relation → Projects | Which project(s) this task belongs to |
| `Assigned Date` | date | The day this task is scheduled to be worked on. The Today page filters on `Assigned Date ≤ today`. |
| `Started Date` | date | When the task first moved to `In Progress`. Set automatically by webhook on status change. **Do not set manually.** |
| `Closed Date` | date | When the task moved to `Done` or `Cancelled`. Set automatically by webhook on status change. Cleared if task is re-opened. **Do not set manually.** |
| `Deadline` | date | Hard deadline. Optional — not all tasks have one. |
| `Depends on` | relation → Tasks (self) | Tasks that must complete before this one can start. Bi-directional with `Prepares for`. |
| `Prepares for` | relation → Tasks (self) | Tasks this task unlocks. Mirror of `Depends on` on the counterpart. |
| `Related Tasks` | relation → Tasks (self) | Loosely related tasks — no dependency semantics. |

**Type property — usage convention:**
- This property tracks *growth investment* only. It is intentionally partial — not every task needs a Type.
- **Assign a Type** when the task represents deliberate personal growth: learning, building, exploring, planning, reflecting, maintaining personal systems, or investing in fitness/health.
- **Leave empty** when the task is an obligation or routine duty (work deliverables, course assignments, admin errands) with no growth intent.
- When creating a task, do NOT guess a Type value. Only set it if the user explicitly specifies one or the task clearly fits a growth category.
- For analytics: "Type is not empty" = all growth activity. Individual Type values enable breakdown by growth mode.

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
| `Importance` | select | Importance level for generated tasks |
| `Urgency` | select | Urgency level for generated tasks (optional) |
| `Projects` | relation → Projects | Projects the generated tasks are linked to |

---

## Weekly Notes

One entry per week. The Today page embeds a filtered view showing the current week's note. Read-only for agents unless the user requests an update.
