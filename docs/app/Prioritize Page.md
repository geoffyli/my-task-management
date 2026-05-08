---
parent: "[[App]]"
tags:
related:
  - "[[Pages]]"
  - "[[Metrics Functions]]"
  - "[[Component Architecture]]"
  - "[[Task Lifecycle]]"
---

# Prioritize Page

Interactive Eisenhower Matrix visualization that plots active tasks on a coordinate system by urgency (X-axis) and importance (Y-axis), with coaching insights informed by Stephen Covey's *7 Habits of Highly Effective People*.

**Source:** `app/src/pages/PrioritizePage.tsx`, `app/src/lib/prioritize.ts`

## Design Philosophy

The Eisenhower Matrix separates tasks into four quadrants based on urgency and importance:

| Quadrant | Position | Label | Action |
|----------|----------|-------|--------|
| Q1 | High urgency, High importance | Do First | Execute immediately |
| Q2 | Low urgency, High importance | Schedule | Plan for focused time |
| Q3 | High urgency, Low importance | Delegate | Reduce or hand off |
| Q4 | Low urgency, Low importance | Eliminate | Remove from list |

Covey's key insight: effective people spend most time in **Q2 (Schedule)** — important work that isn't yet urgent. A healthy system has a high Q2 ratio; crisis mode (Q1-heavy) indicates reactive behaviour.

Rather than a rigid 2×2 grid, this implementation uses a **continuous coordinate system** that maps three-level properties (High/Medium/Low) to positions, giving a more nuanced view of the task landscape.

## Coordinate System

### Base Positions

Each discrete level maps to a fixed coordinate in 0–1 space:

| Level | Base Coordinate |
|-------|----------------|
| Low | 0.15 |
| Medium | 0.50 |
| High | 0.85 |

A dashed crosshair at the midpoint (0.5, 0.5) visually divides the space into four quadrants.

### Micro-Offset X — Deadline Proximity

Within each urgency band, tasks spread horizontally based on how close their deadline is relative to other tasks in the same band.

- Band width: ±0.12
- Closer deadline → further right (more visually urgent)
- Tasks without a deadline remain at base position
- Precomputed per urgency group: `{minDays, maxDays}` across tasks with deadlines

### Micro-Offset Y — Dependency Count

Within each importance band, tasks spread vertically based on their dependency count relative to the maximum in that band.

- Band width: ±0.08
- More dependencies → further up
- Tasks with zero dependencies remain at base position

### Final Coordinate

```
x = clamp(baseX + offsetX, 0.01, 0.99)
y = clamp(baseY + offsetY, 0.01, 0.99)
```

## Visual Encoding

### Dot Color — Task Status

Uses the existing `STATUS_COLORS` constant:

| Status | Color |
|--------|-------|
| Not Started | `#6b7280` (gray) |
| In Progress | `#5e6ad2` (indigo) |

### Dot Size — Days Since Assigned

Encodes how long a task has been sitting since its assigned date.

| Parameter | Value |
|-----------|-------|
| Minimum radius | 6px |
| Maximum radius | 24px |
| Scale | Square root (prevents outliers from dominating) |
| Cap | 90 days (beyond this, max radius) |
| No assigned date | Minimum radius |

Formula: `radius = 6 + 18 × √(min(days, 90) / 90)`

### Dot Opacity — Filter State

- Normal: 0.85
- Faded (filtered out): 0.1
- Hover: white stroke (1.5px)
- Selected: white stroke (2px)

## Task Eligibility

Only actionable tasks appear on the matrix:

| Include | Exclude |
|---------|---------|
| Status: Not Started | Status: Done, Cancelled, Blocked |
| Status: In Progress | Urgency: Overdue |
| Both urgency and importance set | Null urgency or importance |

Tasks excluded due to null fields show in a callout badge linking to the [[Pages#HealthPage|Health page]].

## Interactions

### Hover — Tooltip

Positioned to the right of the dot. Shows:
- Task name
- Status (with color dot)
- Project names
- Urgency / Importance levels
- Deadline
- Days since assigned

### Click — Popover

Fixed-position card near the clicked dot. Includes:
- Task name
- Status, urgency, importance badges
- Project names
- Assigned date and age
- Deadline
- Dependency count
- "Open in Notion" link (via `getNotionUrl()`)

Closes on: click outside, Escape key, window resize.

### No Drag

Changing urgency/importance should be a deliberate Notion edit, not a casual gesture.

## Filters

Two multi-select dropdowns in the page header:

| Filter | Options | Source |
|--------|---------|--------|
| Project | Active projects (In Progress / Not Started) | `useProjects()` |
| Area | All areas | `useAreas()` |

**Behavior:** Non-matching dots fade to 10% opacity rather than disappearing — preserves spatial context. Area filter resolves to project IDs via `project.areaIds`.

**State:** Persisted in URL search params (`?projects=id1,id2&areas=id3`).

## Insights Panel

Four stat cards below the matrix:

| Card | Metric | Accent Logic |
|------|--------|--------------|
| Q1 — Do First | Count of tasks in top-right quadrant | Red if > 5 |
| Q2 — Schedule | Count of tasks in top-left quadrant | Always green |
| Q2 Ratio | `scheduleCount / totalActive × 100` | Green ≥ 40%, Red < 20% |
| Drift Alert | Inferred Q2→Q1 drift count | Red if > 0 |

### Q2 Ratio Thresholds

| Range | Status | Meaning |
|-------|--------|---------|
| ≥ 40% | Healthy | Strategic balance |
| 20–39% | Amber | Room to improve |
| < 20% | Red | Reactive mode |

### Drift Detection

Heuristic: tasks with `importance=High` AND `urgency=High` AND created 21+ days ago likely started as Q2 (important but not urgent) and drifted into Q1 as deadlines approached. No historical urgency tracking required — uses creation date as a proxy.

## Architecture

### Custom SVG (not Recharts)

The matrix uses a hand-built SVG with `ResizeObserver` for responsive square sizing. This was chosen over Recharts `ScatterChart` because:

- Variable dot radius per point (tied to a separate metric)
- Dashed crosshair overlay at fixed midpoint
- Quadrant text labels positioned in each zone
- Direct `getBoundingClientRect()` access for popover positioning
- Square aspect ratio enforcement

### Component Tree

```
PrioritizePage
├── MatrixFilters (Project + Area multi-selects)
├── NullValueCallout (excluded tasks badge)
├── ChartContainer
│   └── EisenhowerMatrix (custom SVG)
│       └── MatrixDot[] (React.memo circles)
├── MatrixTooltip (hover overlay)
├── TaskPopover (click overlay)
└── MatrixInsights (4 × StatCard)
```

### Data Flow

```
useTasks() + useProjects() + useAreas()
    │
    ├─ computeMatrixPoints(tasks, projectLookup) → MatrixPoint[]
    ├─ getNullFieldExclusionCount(tasks) → number
    ├─ computeMatrixInsights(points, totalActive) → MatrixInsightData
    └─ computeDriftCount(tasks) → number
```

## Design Decisions

**Why continuous coordinates over a rigid 2×2 grid?**
Three urgency/importance levels map poorly to two bins. A coordinate system preserves the nuance of Medium while still using the quadrant framework for insight generation.

**Why semantic jitter over random or force-directed layout?**
Micro-offsets carry meaning: deadline proximity and dependency count. Random jitter wastes visual space; force-directed is unpredictable across renders.

**Why exclude Blocked and Overdue tasks?**
Blocked tasks can't be acted on. Overdue is an abnormal state handled separately. The matrix should show only tasks where a prioritization decision is actionable.

**Why inferred drift detection (no new storage)?**
Avoids schema changes and storage overhead. The heuristic (old + high/high = likely drifted) is directionally useful. If historical tracking is added later, the drift signal can be made precise.

**Why `position: fixed` for the popover?**
Avoids z-index stacking context issues within the SVG container. Smart positioning logic handles viewport edge cases.
