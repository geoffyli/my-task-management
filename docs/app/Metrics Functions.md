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

**Source:** `app/src/lib/metrics.ts` (362 lines)

## Overview Stats

### `getOverviewStats(tasks): OverviewStats`

Computes headline numbers for the This Week page.

| Metric | Logic |
|--------|-------|
| `active` | Tasks where status is not Done or Cancelled |
| `overdue` | Active tasks with deadline before today |
| `completedWeek` | Done tasks with assignedDate in last 7 days |
| `completedPrevWeek` | Done tasks with assignedDate 7-14 days ago |
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

### `getRescheduleDistribution(tasks): RescheduleEntry[]`

How much tasks slip from their original assigned date.

- Compares `assignedDate` to `initialAssignedDate` (only where both exist and differ)
- Computes slip in days (positive only — ignoring tasks moved earlier)
- Buckets: 1-3 days, 4-7 days, 1-2 weeks, 2+ weeks

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

Tasks assigned within the current 7-day window (today through +6 days), excluding Done/Cancelled.

### `getCompletedThisWeek(tasks): Task[]`

Tasks marked Done with assignedDate in the current week window.

### `buildTasksByProjectIndex(tasks): Map<string, Task[]>`

O(n) index mapping project IDs to their tasks. A task can appear under multiple projects.

## Helper Dependencies

| Function | Source | Purpose |
|----------|--------|---------|
| `getTimeRangeStart(range)` | `app/src/lib/date-utils.ts` | Converts TimeRange ("30d", "90d", "6m", "all") to start Date |
| `isActiveTask(task)` | `app/src/lib/constants.ts` | Returns true if status is not Done or Cancelled |
