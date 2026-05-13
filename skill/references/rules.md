# Behavioural Rules for Agents

---

## Write Operations — follow the Action Protocol

All write operations (create, update, delete) on any external system **require user confirmation** before execution. See the **Action Protocol** section in `SKILL.md` for:

- Operation classification (read vs. write)
- Trivial update exemptions
- Standard confirmation format (detailed)
- Batch operation handling

**Key points:**
- Always present a detailed confirmation with all fields being written
- Wait for explicit user approval before executing
- For batch operations, use a single consolidated confirmation
- Trivial updates (marking done, completing checkboxes) may bypass if user intent is clear

---

## Creation — use the two-step template pattern

The Notion API has no "apply template" endpoint. Template pages are invisible to the API (`is_template` always returns null in query results). Every Task and Project page **must** be created in two steps: create the page with properties, then immediately append the standard section blocks.

| Database | Step 1 | Step 2 — blocks to append |
|---|---|---|
| **Tasks** | `POST /v1/pages` with properties | `heading_2` "Steps & Updates", `paragraph`, `heading_2` "Overview", `paragraph` |
| **Projects** | `POST /v1/pages` with properties | `heading_2` "Tasks", placeholder `paragraph`, `heading_2` "Goals", `paragraph`, `heading_2` "Resources", `paragraph` — then **notify user** to add the Tasks linked view in Notion UI |
| **Areas** | `POST /v1/pages` with properties | None — area pages have no body content |

Skipping Step 2 leaves an empty page that doesn't match the established structure of the workspace.

---

## Data Integrity

1. **Read before write.** Query the relevant database before creating or updating anything.
2. **Do not write to the `Formula` field.** It is computed and read-only.
3. **Patch both sides of task dependencies explicitly.** When linking `Depends on` on Task A to Task B, also patch `Prepares for` on Task B. Notion does not auto-propagate relation inverses via API.
4. **Do not guess or default the `Type` property.** Only set it when the user explicitly provides a growth category or the task unambiguously fits one. Leaving it empty is correct for obligation/routine tasks.

---

## Calendar Reminders — confirmation required before creating

Before creating or updating any Google Calendar event, always confirm the following details with the user and wait for explicit approval:

- **Title** — the event summary
- **Date and time** — exact datetime (default timezone: UTC+8 / Asia/Shanghai)
- **Reminder(s)** — notification lead time(s), e.g., `popup:30m`, `popup:1d`
- **Notes** — description/side notes (may be empty)

Present a clear confirmation prompt before executing `gws calendar events insert` or `gws calendar events patch` (or any equivalent write command). Never create or modify a calendar event without this confirmation step.

---

## Safety

5. **Never archive or delete pages.** Use status changes (`Done`, `Completed`) to mark completion instead.
6. **Do not modify `Repetitive Tasks Config` entries** unless the user explicitly requests it.
7. **Do not modify Area pages** unless the user explicitly requests it.
8. **Do not add `Tags` to projects** unless the user requests tagging.
9. **Do not modify project page body** (Goals, Resources sections) unless the user requests a content change.
10. **Do not append freeform content to the Today page.** It is a dashboard, not a scratchpad.
11. **When in doubt about which project a task belongs to, ask** — do not guess a project relation.
12. **Check existing areas before creating a new one.** There are currently 7 areas; new areas are rare.
