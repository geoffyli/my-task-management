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
| `/` | DashboardPage | Yes | Task triage dashboard |
| `/trends` | TrendsPage | Yes | Analytics charts and trends |
| `/prioritize` | PrioritizePage | Yes | Eisenhower Matrix prioritization |
| `/projects` | ProjectsAreasPage | Yes | Project health and area workload |
| `/health` | HealthPage | Yes | System health score and rule violations |
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

## DashboardPage

**Purpose:** Operational triage dashboard — surfaces what needs attention right now.

**Data hooks:** `useTasks()`

**Sections:**

1. **Stat cards** (4 cards in responsive grid):
   - Overdue — active tasks past deadline (red accent)
   - Due Soon — tasks with deadlines within 7 days (orange accent)
   - In Progress — tasks with "In Progress" status
   - Blocked — tasks with status set to "Blocked" (red accent)

2. **Upcoming Deadlines** — Active tasks with deadlines in the next 14 days (including overdue), grouped by urgency tier:
   - Overdue (red left border)
   - Due within 3 days (orange left border)
   - Due within 14 days (neutral)
   - Each task links to its Notion page

3. **Blocked Tasks** — Tasks with status explicitly set to "Blocked"
   - Each task links to its Notion page

4. **Waiting on Prerequisites** — Active tasks whose dependencies have status "Not Started"
   - Shows prerequisite task names (up to 3, with "+N more" overflow)
   - Each task links to its Notion page

**Key metrics:** `getOverdueTasks()`, `getDueSoonTasks()`, `getBlockedByStatusTasks()`, `getUpcomingDeadlinesTiered()`, `getPrerequisiteWaitingTasks()`

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

4. **Aging distribution** — Stacked bar chart: active tasks by age bucket, colored by importance
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

## PrioritizePage

**Purpose:** Eisenhower Matrix visualization for task prioritization decisions.

See [[Prioritize Page]] for full design documentation.

**Data hooks:** `useTasks()`, `useProjects()`, `useAreas()`

**State:** Project/area filters stored in URL search params (`?projects=id1,id2&areas=id3`)

**Sections:**

1. **Filters** — Project and area multi-select dropdowns (top-right)
   - Non-matching dots fade to 10% opacity

2. **Null-value callout** — Badge showing count of tasks excluded due to missing urgency/importance
   - Links to Health page

3. **Eisenhower Matrix** — Custom SVG coordinate system (square, 600px max)
   - X-axis: Urgency (Low → High)
   - Y-axis: Importance (Low → High)
   - Dashed crosshairs at midpoint, quadrant labels
   - Dots: color = status, size = days since assigned, position = urgency × importance with semantic offsets

4. **Insights panel** — 4 stat cards below the matrix
   - Q1 count, Q2 count, Q2 ratio (with health threshold), drift alert

**Key metrics:** `computeMatrixPoints()`, `computeMatrixInsights()`, `computeDriftCount()`, `getNullFieldExclusionCount()`

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
