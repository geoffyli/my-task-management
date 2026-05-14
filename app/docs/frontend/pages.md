---
parent: "[[frontend-moc]]"
tags:
  - frontend
  - pages
  - routes
related:
  - "[[state-management]]"
  - "[[charting]]"
  - "[[metrics-functions]]"
---

# Pages

All routes in the application with their data requirements and key features.

**Source:** `src/pages/`, routing in `src/App.tsx`

## Route Table

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/` | DashboardPage | Yes | Task triage dashboard |
| `/trends` | TrendsPage | Yes | Analytics charts and trends |
| `/prioritize` | PrioritizePage | Yes | Eisenhower Matrix for urgency/importance triage |
| `/projects` | ProjectsAreasPage | Yes | Project health and area workload |
| `/health` | HealthPage | Yes | Data health monitoring and rule violations |
| `/settings` | SettingsPage | Yes | Theme, sync management, webhook config |
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

**Data hooks:** `useTasks()`, `useProjects()`

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

3. **Blocked Tasks** — Tasks with status explicitly set to "Blocked"

4. **Waiting on Prerequisites** — Active tasks whose dependencies have status "Not Started"
   - Shows prerequisite task names (up to 3, with "+N more" overflow)

**Task interaction:** All task items open the unified `TaskDetailPopover` on click (with "View Network" and "Open in Notion" actions). See [[task-network]].

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

5. **Calendar heatmap** — Custom grid showing daily activity intensity
   - Data: `getCalendarHeatmapData(tasks, range)`

## PrioritizePage

**Purpose:** Eisenhower Matrix visualization — positions tasks by urgency (x-axis) and importance (y-axis) for strategic triage.

**Data hooks:** `useTasks()`, `useProjects()`, `useAreas()`

**State:** Project and area filters stored in URL search params (`?projects=id1,id2&areas=id3`)

**Sections:**

1. **Insight cards** (4 cards):
   - Q1 — Do First count (urgent + important)
   - Q2 — Schedule count (not urgent + important)
   - Q2 Ratio — percentage of active tasks in Schedule quadrant (healthy ≥ 40%)
   - Drift Alert — high urgency + high importance tasks lingering > 21 days

2. **Null value callout** — Warns when active tasks are excluded from the matrix due to missing urgency or importance values

3. **Eisenhower Matrix** — Custom SVG scatter plot (max 600×600px, 1:1 aspect ratio)
   - Quadrant dividers at midpoint (dashed lines)
   - Quadrant labels: Do First, Schedule, Delegate, Eliminate
   - Axis labels: Urgency →, Importance →

4. **Filter controls** — Project and Area multi-select dropdowns (non-matching dots fade to 10% opacity)

**Task eligibility:** Only tasks with `status ∈ {Not Started, In Progress}` AND non-null `urgency ∈ {High, Medium, Low}` AND non-null `importance` appear on the matrix.

**Dot layout — Sunflower Spiral:**

Tasks sharing the same urgency/importance combination would overlap at identical coordinates. The layout uses a golden-angle (Fermat) spiral to spread co-located dots:

- Base positions: `{Low: 0.15, Medium: 0.50, High: 0.85}` on each axis (9 possible cells)
- Dots grouped by cell, sorted largest-radius-first (oldest tasks at center)
- Spiral formula: `angle_i = i × φ`, `r_i = c × √i` where `φ = π(3 − √5)` ≈ 137.5°
- Adaptive spacing compresses if the group exceeds the cell's safe radius (0.12 normalized units)
- Dot radius scales from 6–24px based on days since assignment (√ curve, capped at 90 days)

**Data functions:** `computeMatrixPoints()`, `computeMatrixInsights()`, `computeDriftCount()`, `getNullFieldExclusionCount()` — all in `src/lib/prioritize.ts`

**Task interaction:** Hover shows `MatrixTooltip`; click opens `TaskDetailPopover` with "View Network" and "Open in Notion" actions.

## ProjectsAreasPage

**Purpose:** Project health monitoring and area workload analysis.

**Data hooks:** `useTasks()`, `useProjects()`, `useAreas()`

**Filtering:** Archived projects (`status === "Archived"`) are excluded client-side before any computation. All sections below operate on active (non-archived) projects only.

**Sections:**

1. **Project health** — Horizontal stacked bar chart showing task status breakdown per project
   - Data: `getProjectHealth(tasks, activeProjects)`
   - Colors: STATUS_COLORS map

2. **At-risk projects** — Alert section highlighting projects with high overdue ratios or staleness
   - Data: `getAtRiskProjects(tasks, activeProjects)`
   - Risk reasons displayed as text

3. **Area workload** — Vertical stacked bar chart showing task distribution across areas
   - Only counts tasks belonging to non-archived projects

4. **Project progress cards** — Grid of cards showing completion percentage bars per project
   - Only renders non-archived projects

## HealthPage

**Purpose:** Data health monitoring — surfaces tasks and projects with missing or inconsistent data that need fixing in Notion.

**Data hooks:** `useHealthReport(cutoffDate)` (wraps `useTasks()` + `useProjects()`)

**Filters** (persisted in URL search params):
- Severity: All / Errors / Warnings / Info
- Entity type: All / Tasks / Projects
- Cutoff: 30 days / 90 days (default) / 6 months / All time

**Sections:**

1. **Summary bar** — Three severity badges showing error, warning, and info counts

2. **Filter bar** — Three `SegmentedControl` toggle groups

3. **Rule groups** — Collapsible sections sorted by severity (errors first)
   - Error groups auto-expanded on load
   - Each group shows: rule name, severity dot, violation count
   - Expanded content: rule description + violation items
   - Each violation item is clickable → opens `TaskDetailPopover` (with "View Network" and "Open in Notion" actions)
   - Data: `computeHealthReport(tasks, projects, cutoffDate)` from [[health-rules]]

**Sidebar badge:** Error count badge appears on the "Health" nav item when errors > 0 (uses `useHealthErrorCount()` hook).

## SettingsPage

**Purpose:** Application preferences and system administration.

**Data hooks:** `useSyncStatus()`, `useSyncEvents(limit, offset)`, `useWebhookStatus()`

**Sections:**

1. **Theme settings** — Appearance selector (System/Light/Dark) via `ThemeSettings` component. Renders regardless of API status. Uses `useTheme()` context for preference management.

2. **Sync status cards** — Last full sync, last reconciliation, last webhook timestamps + page counts

3. **Force sync button** — Triggers `POST /api/sync` with loading spinner and success/error feedback

4. **Webhook setup** — Displays:
   - Webhook URL (from env, for reference)
   - Verification token (with copy-to-clipboard button)
   - Verification status (verified or pending)

5. **Event log** — Paginated table of sync events:
   - Columns: time, type, source, payload preview
   - Pagination controls (limit: 10 per page)
   - Expandable payload details

## Data Flow Pattern

All pages follow the same pattern:

```
useQuery hook → raw data (Task[], Project[], Area[])
    ↓
useMemo → computed metrics (via metrics.ts functions)
    ↓
render → charts, cards, tables
```

Analytics are computed client-side from the full dataset. The server provides raw records; the frontend handles all aggregation and visualization.
