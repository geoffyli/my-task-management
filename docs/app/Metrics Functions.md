---
parent: "[[App]]"
tags:
related:
  - "[[Charting]]"
  - "[[Pages]]"
  - "[[Types Reference]]"
---

# Metrics & Analytics Functions

All analytics computations that power the dashboard visualizations. These run client-side from the full task/project dataset.

**Source:** `app/src/lib/metrics.ts`

## Overview Stats

### `getOverviewStats(tasks): OverviewStats`

Computes headline numbers for the analytics pages.

| Metric | Logic |
|--------|-------|
| `active` | Tasks where status is not Done or Cancelled |
| `overdue` | Active tasks with deadline before today |
| `completedWeek` | Done tasks with closedDate (assignedDate fallback) in current Mon–Sun week |
| `completedPrevWeek` | Done tasks with closedDate (assignedDate fallback) in previous Mon–Sun week |
| `avgAge` | Average days since creation for active tasks |

## Throughput & Velocity

### `getThroughputData(tasks, range): ThroughputEntry[]`

Weekly buckets of created vs completed tasks.

- Buckets tasks by week (Monday-start) based on `createdTime` and `assignedDate` (for Done tasks)
- Returns: `{ week: "May 05", created: 3, completed: 5 }[]`

### `getVelocityData(tasks, range): VelocityEntry[]`

Completion velocity with 4-week rolling average.

- Built on top of throughput data
- Rolling average: mean of current + previous 3 weeks' completed count
- Returns: `{ week, completed, average }[]`

### `getBurndownData(tasks, range): BurndownEntry[]`

Open task count over time (how many tasks were open at each week boundary).

- For each week: counts tasks created before that point and not yet closed
- Returns: `{ week, open }[]`

## Distribution Analysis

### `getAgingDistribution(activeTasks): AgingBucket[]`

Active tasks bucketed by age and split by importance.

| Bucket | Range |
|--------|-------|
| 0-7d | Created 0-7 days ago |
| 7-14d | Created 7-14 days ago |
| 14-30d | Created 14-30 days ago |
| 30-60d | Created 30-60 days ago |
| 60-90d | Created 60-90 days ago |
| 90d+ | Created >90 days ago |

Returns: `{ bucket, high, medium, low }[]`

## Calendar Heatmap

### `getCalendarHeatmapData(tasks, range?): CalendarDayEntry[]`

Daily activity counts for a heatmap visualization.

- Counts both task creation dates and completion dates
- Returns: `{ date: "2026-05-02", count: 3 }[]` sorted chronologically

## Project & Risk Analysis

### `getProjectHealth(tasks, projects): ProjectHealthEntry[]`

Task status breakdown per project.

- Uses `buildTasksByProjectIndex()` for O(n) lookup
- Returns: `{ project, notStarted, inProgress, done, blocked, cancelled }[]`
- Filters out projects with zero tasks

### `getAtRiskProjects(tasks, projects): { project, reason }[]`

Identifies projects that need attention.

Risk triggers:
- **Overdue ratio**: >50% of active tasks past deadline -> `"X/Y tasks overdue"`
- **Staleness**: No edits in >7 days -> `"No activity for N days"`

### `getBlockedTasksSummary(tasks): BlockedTasksSummary`

Dependency analysis — finds tasks blocked by other active tasks.

- A task is "blocked" if any of its `dependencies` point to tasks that are still active
- Returns top 10 blocked tasks sorted by dependency count
- Includes total `blockedCount`

## Supporting Functions

### `getDeadlineProximity(tasks): DeadlineEntry[]`

Active tasks with deadlines, sorted by urgency (fewest days remaining first).

### `getTasksThisWeek(tasks): Task[]`

Active tasks assigned within the current Mon–Sun week, excluding Done/Cancelled.

### `getCompletedThisWeek(tasks): Task[]`

Tasks marked Done with closedDate (or assignedDate fallback) in the current Mon–Sun week.

### `getActiveTasks(tasks): Task[]`

Filters to tasks with status not Done or Cancelled.

### `getStatusCounts(tasks): { status, count }[]`

Status distribution across all tasks.

### `getImportanceCounts(activeTasks): { importance, count }[]`

Importance distribution across active tasks.

### `buildTasksByProjectIndex(tasks): Map<string, Task[]>`

O(n) index mapping project IDs to their tasks. A task can appear under multiple projects.

## Dashboard Functions

### `getOverdueTasks(tasks): Task[]`

Active tasks with deadline before today.

### `getDueSoonTasks(tasks, days = 7): Task[]`

Active tasks with deadline between today and today + N days (exclusive of overdue).

### `getBlockedByStatusTasks(tasks): Task[]`

Tasks with status explicitly set to "Blocked".

### `getUpcomingDeadlinesTiered(tasks): TieredDeadlineTask[]`

Active tasks with deadlines within 14 days (including overdue), classified into urgency tiers:
- `overdue` — deadline before today
- `critical` — deadline within 3 days
- `upcoming` — deadline within 14 days

Sorted by deadline ascending. Returns: `{ id, name, importance, deadline, tier }[]`

### `getPrerequisiteWaitingTasks(tasks): PrerequisiteWaitingTask[]`

Active (non-Blocked) tasks whose dependencies include at least one task with status "Not Started".
- Resolves dependency IDs against the full task list
- Returns: `{ id, name, importance, notStartedPrereqs: { id, name }[] }[]`

### `getDriftTasks(tasks): DriftTask[]`

High-priority tasks that are stalling — importance=High AND urgency=High AND created 21+ days ago, still Not Started or In Progress.
- Uses `DRIFT_THRESHOLD_DAYS` (21) from `prioritize.ts`
- Returns: `{ id, name, importance, daysSinceCreated }[]`

### `getNetFlow(tasks): { completed, created, net }`

Net task flow for the most recent week — are you completing more than creating?
- Built on top of `getThroughputData(tasks, "30d")`, takes the last week entry
- `net` = completed - created (positive means reducing backlog)

## Helper Dependencies

| Function | Source | Purpose |
|----------|--------|---------|
| `getTimeRangeStart(range)` | `app/src/lib/date-utils.ts` | Converts TimeRange ("30d", "90d", "6m", "all") to start Date |
| `isActiveTask(task)` | `app/src/lib/constants.ts` | Returns true if status is not Done or Cancelled |
| `downloadCSV(tasks, filename)` | `app/src/lib/csv-export.ts` | Exports task data as CSV download (used by ChartContainer) |

## Prioritization

Functions powering the [[Prioritize Page]] Eisenhower Matrix. These compute task coordinates, visual properties, and coaching insights.

**Source:** `app/src/lib/prioritize.ts`

### `getMatrixEligibleTasks(tasks): Task[]`

Filters to tasks that can be plotted: status is Not Started or In Progress, urgency is not null or Overdue, importance is not null.

### `computeMatrixPoints(tasks, projectLookup): MatrixPoint[]`

Full pipeline from raw tasks to positioned dots. For each eligible task:

1. Assigns base X/Y from urgency/importance level (Low=0.15, Medium=0.50, High=0.85)
2. Applies micro-offset X (±0.12) based on deadline proximity within urgency group
3. Applies micro-offset Y (±0.08) based on dependency count within importance group
4. Clamps final coordinates to [0.01, 0.99]
5. Computes dot radius from assigned date
6. Determines quadrant from position

Precomputes per-group statistics (deadline min/max, max dependency count) for O(n) offset calculation.

### `computeDotRadius(assignedDate): number`

| Input | Output |
|-------|--------|
| `null` or future date | 6px (minimum) |
| 0–90 days ago | 6 + 18 × √(days/90) px |
| > 90 days ago | 24px (maximum) |

### `getQuadrant(x, y): Quadrant`

| Condition | Result |
|-----------|--------|
| x ≥ 0.5, y ≥ 0.5 | `"do-first"` |
| x < 0.5, y ≥ 0.5 | `"schedule"` |
| x ≥ 0.5, y < 0.5 | `"delegate"` |
| x < 0.5, y < 0.5 | `"eliminate"` |

### `computeMatrixInsights(points, totalActive): MatrixInsightData`

Single-pass quadrant counting with Q2 ratio health assessment.

| Q2 Ratio | Status |
|----------|--------|
| ≥ 40% | `"healthy"` |
| 20–39% | `"amber"` |
| < 20% | `"red"` |

### `computeDriftCount(tasks): number`

Inferred Q2→Q1 drift: count of tasks where importance=High AND urgency=High AND created 21+ days ago. These likely started as Q2 (important, not yet urgent) and drifted as deadlines approached.

### `getNullFieldExclusionCount(tasks): number`

Count of active tasks (Not Started / In Progress) excluded from the matrix due to null urgency, null importance, or Overdue urgency. Used by the null-value callout badge.
