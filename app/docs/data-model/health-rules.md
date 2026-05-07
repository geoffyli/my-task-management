---
parent: "[[data-model-moc]]"
tags:
  - data-model
  - health
  - rules
  - reference
related:
  - "[[types-reference]]"
  - "[[metrics-functions]]"
  - "[[pages]]"
---

# Health Rules Engine

Evaluates data completeness rules against tasks and projects, surfacing violations grouped by severity. Designed for operational awareness — each violation points to a specific item that needs fixing in Notion.

**Source:** `src/lib/health.ts`

**Computation:** Client-side, pure functions on `Task[]` / `Project[]` arrays (same pattern as `src/lib/metrics.ts`).

**Hook:** `src/hooks/useHealthReport.ts` — wraps the engine for React consumption (used by both the Health page and the Sidebar error badge).

## Types

```typescript
type HealthSeverity = "error" | "warning" | "info";
type HealthEntityType = "task" | "project";

interface HealthRule {
  id: string;
  name: string;
  description: string;
  severity: HealthSeverity;
  entityType: HealthEntityType;
}

interface HealthViolation {
  ruleId: string;
  entityId: string;
  entityName: string;
  entityType: HealthEntityType;
  context: string;
}

interface HealthRuleResult {
  rule: HealthRule;
  violations: HealthViolation[];
}

interface HealthReport {
  errors: number;
  warnings: number;
  info: number;
  results: HealthRuleResult[];  // sorted by severity: errors first
}
```

## Severity Model

Three tiers classify the urgency of each health violation:

| Tier | Meaning | Action expectation |
|------|---------|-------------------|
| **Error** | Violates a hard rule that actively undermines workflow. Missing critical fields or operational failures. | Fix immediately — these indicate broken or unusable data. |
| **Warning** | Missing data that reduces visibility but isn't blocking. Bookkeeping gaps. | Fix during cleanup passes — system works but insights are degraded. |
| **Info** | Nice-to-have completeness. Low operational impact. | Fix opportunistically — improves data quality but not urgent. |

The sidebar badge shows **error count only** to avoid notification fatigue.

## Rule Set

### Task Rules

All task rules apply regardless of status (active + completed + cancelled), subject to the cutoff date filter.

| Rule ID | Name | Severity | Condition | Description |
|---------|------|----------|-----------|-------------|
| `task-importance-not-set` | Importance not set | Error | `importance === null` | All tasks should have Importance set for proper triage |
| `task-urgency-not-set` | Urgency not set | Error | `urgency === null` | All tasks should have Urgency set for scheduling |
| `task-deadline-not-set` | Deadline not set (high urgency) | Error | Urgency is `"High"` or `"Overdue"` AND `deadline === null` | Urgent/overdue tasks must have a hard deadline |
| `task-assigned-date-not-set` | Assigned Date not set | Error | Status is `"In Progress"` AND `assignedDate === null` | Active tasks need a schedule date |
| `task-started-date-not-set` | Started Date not set | Error | Status is `"In Progress"` or `"Done"` AND `startedDate === null` | Tasks that progressed need a start date |
| `task-closed-date-not-set` | Closed Date not set | Error | Status is `"Done"` or `"Cancelled"` AND `closedDate === null` | Terminal tasks need a closure date |
| `task-deadline-missed` | Deadline missed, no progress | Error | `deadline` is in the past AND Status is `"Not Started"` | Operational failure: deadline passed with zero progress |
| `task-initial-assigned-not-set` | Initial Assigned Date not set | Warning | `assignedDate` is set AND `initialAssignedDate === null` | Needed for reschedule tracking |
| `task-assigned-past-not-started` | Assigned Date in past, not started | Info | `assignedDate` > 1 day ago AND Status is `"Not Started"` | Scheduled task hasn't been picked up |

### Project Rules

All project rules **exclude Archived projects** from evaluation.

| Rule ID | Name | Severity | Condition | Description |
|---------|------|----------|-----------|-------------|
| `project-no-area` | No Area assigned | Warning | Status is Not Started / In Progress / On Hold / In Maintenance AND `areaIds` is empty | Projects should be categorized into an Area |
| `project-priority-not-set` | Priority not set | Warning | Status is `"In Progress"` or `"In Maintenance"` AND `priority === null` | Active projects need priority for triage against other projects |

## Filtering

The health engine supports three filter dimensions (applied in the UI):

### Cutoff Date

- Only evaluates tasks with `createdTime >= cutoffDate`
- Default: 90 days (configurable via URL param)
- Purpose: avoid noise from historical items created before the current standards were established
- **Projects are not filtered by cutoff** — there are few projects and all should be healthy regardless of age

### Severity Filter

Show only errors, warnings, info, or all.

### Entity Type Filter

Show only task violations, project violations, or all.

## API

### `computeHealthReport(tasks, projects, cutoffDate)`

Main entry point. Returns a `HealthReport` with all violations grouped by rule and sorted by severity.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasks` | `Task[]` | All tasks from the API |
| `projects` | `Project[]` | All projects from the API |
| `cutoffDate` | `string \| null` | ISO timestamp; only tasks created after this date are evaluated. `null` = no cutoff (all tasks). |

### `getNotionUrl(pageId)`

Constructs a direct Notion page URL from a page ID.

```typescript
getNotionUrl("350414c3-2bf8-8022-9e4b-ff1191cb86e6")
// → "https://notion.so/350414c32bf880229e4bff1191cb86e6"
```

## Phase 2 — Content-Based Checks (Deferred)

The following rules require fetching page content via the Notion Blocks API and are not yet implemented:

| Rule | Condition | Severity |
|------|-----------|----------|
| `## Output` section missing or empty | Task status is Done | Info |
| `## Steps` section missing or empty | Task status is Done | Info |
| `## Overview` section missing or empty | Task status is Done | Info |
| `## Goals` section missing or empty | Project status is In Progress or In Maintenance | Info |

### Implementation Approach

1. At sync time, call `GET /v1/blocks/{page_id}/children` from the Notion API
2. Parse the block tree to find H2 headings matching target names
3. Store boolean flags (`has_output_section`, `has_steps_section`, etc.) on the task/project record
4. Add rules to `HEALTH_RULES` with evaluation logic checking the stored flags
5. The engine skips content-based rules when flag data is unavailable (graceful degradation)
