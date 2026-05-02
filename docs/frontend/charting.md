---
parent: "[[frontend-moc]]"
tags:
  - frontend
  - charts
  - recharts
  - visualization
related:
  - "[[chart-theming]]"
  - "[[metrics-functions]]"
  - "[[pages]]"
---

# Charting & Visualizations

All data visualizations use Recharts 3, a React-native charting library built on D3 primitives.

## Chart Types Used

| Recharts Component | Pages | Purpose |
|-------------------|-------|---------|
| `BarChart` | Trends, Projects | Throughput, aging distribution, reschedule, project health |
| `ComposedChart` | Trends | Velocity (bar + line combination) |
| `LineChart` | Trends | Throughput trend (alternative) |
| Custom heatmap | Trends | Calendar activity visualization |

All charts are wrapped in `<ResponsiveContainer>` for automatic resizing.

## Shared Components

### ChartContainer

**Source:** `src/components/shared/ChartContainer.tsx`

Wrapper providing consistent card-style framing for charts:
- Title and description
- Optional export button (CSV download)
- Consistent padding and spacing

### TimeRangeSelector

**Source:** `src/components/shared/TimeRangeSelector.tsx`

Segmented control for filtering chart data by time range:
- Options: 30 days, 90 days, 6 months, All time
- Stored in URL params for persistence

## Chart Integration Pattern

```tsx
// Typical chart usage in a page component
const { data: tasks } = useTasks();
const throughput = useMemo(() => getThroughputData(tasks ?? [], range), [tasks, range]);

<ChartContainer title="Throughput" description="Tasks created vs completed per week">
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={throughput} margin={CHART_THEME.margin}>
      <CartesianGrid {...CHART_THEME.grid} />
      <XAxis dataKey="week" tick={CHART_THEME.axisTick} />
      <YAxis tick={CHART_THEME.axisTick} />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      <Bar dataKey="created" fill={CHART_THEME.series.primary} />
      <Bar dataKey="completed" fill={CHART_THEME.series.secondary} />
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>
```

## Charts by Page

### Trends Page

| Chart | Type | Data Function | Series |
|-------|------|---------------|--------|
| Throughput | BarChart | `getThroughputData()` | created (primary), completed (secondary) |
| Velocity | ComposedChart | `getVelocityData()` | completed bar (primary), average line (quaternary) |
| Aging Distribution | BarChart (stacked) | `getAgingDistribution()` | high/medium/low priority |
| Reschedule | BarChart | `getRescheduleDistribution()` | count (primary) |
| Calendar Heatmap | Custom | `getCalendarHeatmapData()` | Intensity-based coloring |

### Projects & Areas Page

| Chart | Type | Data Function | Series |
|-------|------|---------------|--------|
| Project Health | BarChart (stacked, horizontal) | `getProjectHealth()` | 5 status colors |
| Area Workload | BarChart (stacked, vertical) | Custom grouping | Area-specific colors |

## Theming

See [[chart-theming]] for the complete `CHART_THEME` object, series colors, tooltip styling, and domain color maps.

## Empty & Loading States

Each chart handles three states:
- **Loading**: `<LoadingState />` — centered spinner
- **Empty**: `<EmptyState />` — friendly message when no data matches the time range
- **Data**: renders the chart

```tsx
if (isLoading) return <LoadingState />;
if (!data?.length) return <EmptyState message="No data for this time range" />;
return <BarChart ... />;
```
