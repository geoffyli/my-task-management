---
parent: "[[Automation]]"
tags:
related:
  - "[[Tasks Webhook Router]]"
  - "[[Task Lifecycle]]"
  - "[[Update Legacy Tasks]]"
---

# Set Task Init Date

> **Status: SUPERSEDED (2026-05-07)**
> This script's logic has been merged into [[Tasks Webhook Router]] as the `handleInitDate` handler. The standalone HTTP trigger (`notion/webhook/task-init-date`) was removed. The script file remains in the codebase for reference and direct invocation but has no active webhook trigger.

## Purpose

When a task's "Assigned Date" property is first set in Notion, this script records that value as the "Initial Assigned Date". This preserves the original scheduling intent — the immutable record of when you first planned to do a task.

## Current Behavior (via Router)

- **Trigger:** Handled by `tasks_webhook_router` when property `lMKd` (Assigned Date) changes
- **Immutability:** Once Initial Assigned Date is set, it is never cleared or overwritten — regardless of subsequent changes to Assigned Date
- See [[Tasks Webhook Router]] for the full dispatch architecture
- **File:** `set_task_init_date.http_trigger.yaml`

## How It Works

### Preprocessor (Request Filtering)

The `preprocessor` function runs before `main` and filters incoming webhook events:

1. **Verification handshake:** If the payload contains a `verification_token`, passes it through for the one-time Notion webhook setup.
2. **Event type check:** Only processes `page.properties_updated` events; all others are skipped.
3. **Database validation:** Confirms the event targets the Tasks database (`a43c2d3d-11e5-4a66-be42-dd411a1d9727`) by checking `data.parent.id`.
4. **Property filter:** Only proceeds if the `updated_properties` array contains the "Assigned Date" property ID (`lMKd`). This also prevents bounce-back loops from the script's own writes to "Initial Assigned Date" (`nJET`).
5. **Extracts page ID** from `entity.id` and passes it to `main`.

### Main Logic

1. **Fetch the full page** from Notion using the page ID from the preprocessor.
2. **Extract property values** for "Assigned Date" and "Initial Assigned Date".
3. **Apply business rules:**
   - If "Initial Assigned Date" already exists and "Assigned Date" is cleared: clear "Initial Assigned Date" too.
   - If "Initial Assigned Date" already exists and "Assigned Date" has a value: no action (initial date is already recorded).
   - If "Initial Assigned Date" is empty and "Assigned Date" has a value: set "Initial Assigned Date" to the current "Assigned Date" value.
   - If both are empty: no action.

## Configuration

| Parameter | Source | Value |
|-----------|--------|-------|
| Notion resource | `wmill.getResource` | `f/notion/api` (fetched at runtime, not passed as arg) |
| Tasks database ID | Hardcoded constant | `a43c2d3d-11e5-4a66-be42-dd411a1d9727` |
| Assigned Date property ID | Hardcoded constant | `lMKd` |

Note: Unlike the scheduled scripts, this script fetches the Notion resource programmatically using `wmill.getResource` rather than receiving it as a parameter, because HTTP trigger scripts receive their parameters from the request payload.

## Key Functions

| Function | Role |
|----------|------|
| `preprocessor` | Filters webhook events, handles verification, validates database and property |
| `main` | Fetches page, applies init date logic, updates Notion |
| `extractDateProperty` | Safely extracts a date string from a Notion property object |
| `normalizeUuid` | Strips hyphens and lowercases UUIDs for comparison |

## Return Value

```json
{
  "action": "initial_date_set",
  "page_id": "abc123",
  "assigned_date": "2026-05-02",
  "initial_assigned_date": "2026-05-02"
}
```

Other possible actions: `"initial_date_cleared"`, `"no_action_needed"`, `"skipped"`.
