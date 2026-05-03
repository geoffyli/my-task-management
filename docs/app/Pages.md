---
parent: "[[App]]"
tags:
related:
  - "[[State Management]]"
  - "[[Charting]]"
  - "[[Metrics Functions]]"
---

# Pages

All routes in the application with their data requirements and key features.

**Source:** `app/src/pages/`, routing in `app/src/App.tsx`

## Route Table

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/` | ThisWeekPage | Yes | Weekly task overview |
| `/trends` | TrendsPage | Yes | Analytics charts and trends |
| `/projects` | ProjectsAreasPage | Yes | Project health and area workload |
| `/settings` | SettingsPage | Yes | Sync management and webhook config |
| `*` | Redirect to `/` | Yes | Catch-all |
| (unauthenticated) | LoginPage | No | Token login |

## LoginPage

**Purpose:** Token-based authentication entry point.

**Features:**
- Password-type input for token
- "Remember me for 7 days" checkbox
- Form validation (token required)
- Error message display on invalid token
- Loading state on submit button

**Data:** None — calls `POST /api/auth/login` directly via AuthContext.

## ThisWeekPage

**Purpose:** Dashboard for current week task management.

**Data hooks:** `useTasks()`, `useProjects()`

**Sections:**

1. **Stat cards** (5 cards in responsive grid):
   - Tasks This Week — count of tasks assigned this week
   - In Progress — tasks with "In Progress" status
   - Overdue — active tasks past deadline
   - Completed — tasks done this week
   - Blocked — tasks with active dependencies

2. **Week overview** — Tasks grouped by day (Today, Tomorrow, etc. through end of week)
   - Color-coded status dots
   - Priority badges
   - Deadline indicators

3. **Upcoming deadlines** — Active tasks with deadlines in the next 14 days, sorted by urgency

4. **Blocked tasks** — Tasks with unresolved dependencies, showing blocker count

**Key metrics:** `getOverviewStats()`, `getTasksThisWeek()`, `getCompletedThisWeek()`, `getBlockedTasksSummary()`, `getDeadlineProximity()`

## TrendsPage

**Purpose:** Analytics dashboard with time-series visualizations.

**Data hooks:** `useTasks()`

**State:** Time range stored in URL search params (`?range=90d`)

**Sections:**

1. **Time range selector** — 30d / 90d / 6m / All time (segmented control)

2. **Throughput chart** — Bar chart: tasks created vs completed per week
   - Data: `getThroughputData(tasks, range)`

3. **Velocity chart** — Composed chart: completed tasks (bars) + 4-week rolling average (line)
   - Data: `getVelocityData(tasks, range)`

4. **Aging distribution** — Stacked bar chart: active tasks by age bucket, colored by priority
   - Data: `getAgingDistribution(activeTasks)`

5. **Reschedule distribution** — Bar chart: how much tasks slip from original assignment
   - Data: `getRescheduleDistribution(tasks)`

6. **Calendar heatmap** — Custom grid showing daily activity intensity
   - Data: `getCalendarHeatmapData(tasks, range)`

## ProjectsAreasPage

**Purpose:** Project health monitoring and area workload analysis.

**Data hooks:** `useTasks()`, `useProjects()`, `useAreas()`

**Sections:**

1. **Project health** — Horizontal stacked bar chart showing task status breakdown per project
   - Data: `getProjectHealth(tasks, projects)`
   - Colors: STATUS_COLORS map

2. **At-risk projects** — Alert section highlighting projects with high overdue ratios or staleness
   - Data: `getAtRiskProjects(tasks, projects)`
   - Risk reasons displayed as text

3. **Area workload** — Vertical stacked bar chart showing task distribution across areas

4. **Project progress cards** — Grid of cards showing completion percentage bars per project

## SettingsPage

**Purpose:** System administration — sync control and webhook configuration.

**Data hooks:** `useSyncStatus()`, `useSyncEvents(limit, offset)`, `useWebhookStatus()`

**Sections:**

1. **Sync status cards** — Last full sync, last reconciliation, last webhook timestamps + page counts

2. **Force sync button** — Triggers `POST /api/sync` with loading spinner and success/error feedback

3. **Webhook setup** — Displays:
   - Webhook URL (from env, for reference)
   - Verification token (with copy-to-clipboard button)
   - Verification status (verified or pending)

4. **Event log** — Paginated table of sync events:
   - Columns: time, type, source, payload preview
   - Pagination controls (limit: 10 per page)
   - Expandable payload details

## Data Flow Pattern

All pages follow the same pattern:

```
useQuery hook -> raw data (Task[], Project[], Area[])
    |
useMemo -> computed metrics (via metrics.ts functions)
    |
render -> charts, cards, tables
```

Analytics are computed client-side from the full dataset. The server provides raw records; the frontend handles all aggregation and visualization.
