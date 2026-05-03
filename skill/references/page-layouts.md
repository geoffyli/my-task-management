# Page Layouts

Verified block-level structures for key pages. All layouts confirmed via live API inspection.

---

## Today Page

**Page ID:** `253414c3-2bf8-8083-9e01-c4da653037e3`  
**Type:** Workspace root page (parent: workspace)

```
[column_list]  — 2-column header
  LEFT column
    paragraph  "Projects"           ← navigation link
    paragraph  "Tasks"              ← navigation link
    paragraph  "Inbox"              ← navigation link
    unsupported {block_type:"button"}  ← "Add Task" button
    unsupported {block_type:"button"}  ← "Add Daily Task" button

  RIGHT column
    callout "Info"
      numbered_list_item  "Check & update legacy tasks"
      numbered_list_item  "Check & update Tasks back logs"
      numbered_list_item  "Check Inbox"

[child_database]  title:"Untitled"  ← Tasks view
  filtered: Assigned Date = today
  grouped by: Status (Not Started → In Progress → Done)

[paragraph]  (empty separator)

[child_database]  title:"Weekly Notes"  ← Weekly Notes view
  filtered: current week's entry

[paragraph]  (empty)
```

**Button blocks:** The "Add Task" and "Add Daily Task" buttons appear as `unsupported {block_type: "button"}` in the API — they cannot be clicked, read, or replicated via API. Replicate their behaviour using the create-task operations in `references/operations.md`.

**"Add Task" vs "Add Daily Task":**
- **Add Task** — `Assigned Date` and `Initial Assigned Date` both left empty.
- **Add Daily Task** — `Assigned Date` and `Initial Assigned Date` both set to today.

**Info callout:** Static daily-ops reminder for the user. Do not modify it.

---

## Task Page

Each task page in the Tasks database follows this structure:

```
[heading_2]  "Steps & Updates"
[to_do]  "Step 1..."   checked=false/true
[to_do]  "Step 2..."   checked=false/true
  [to_do]  "Sub-step..." (nested)
[paragraph]  (empty)

[heading_2]  "Overview"
[paragraph / bulleted_list_item / code / child_page / ...]  (freeform, varies per task)
```

**Steps & Updates:** Always the first section. Use `to_do` blocks (checkboxes) to track sub-steps. Mark complete with `PATCH /v1/blocks/{block_id}` → `{"to_do": {"checked": true}}`.

**Overview:** Freeform — may contain paragraphs, bullet lists, code blocks, links, sub-pages, or may be empty.

---

## Project Page

Each project page in the Projects database follows this structure:

```
[heading_2]  "Tasks"
[child_database]  title:"Untitled"  ← inline Tasks view (filtered to this project)
[paragraph]  (empty)

[heading_2]  "Goals"
[paragraph / ...]  (freeform goal description)
[paragraph]  (empty)

[heading_2]  "Resources"
[paragraph / bulleted_list_item / file / child_page / ...]  (freeform resources)
[paragraph]  (empty)
```

**Tasks view (child_database):** This inline database is created automatically by Notion's template, pre-filtered to show only tasks linked to the project. It **cannot be replicated via API** — creating a `child_database` block via API produces a new empty database, not a filtered view of the main Tasks database. When creating a project via API, append a placeholder paragraph under "Tasks" and notify the user to manually add the linked Tasks view in the Notion UI.

---

## Area Page

All area pages have **zero body blocks** — they contain no content sections. They are purely property-based. No template body is needed when creating an area.
