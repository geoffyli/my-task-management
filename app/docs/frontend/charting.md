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
| `BarChart` | Trends, Projects | Throughput, aging distribution, project health |
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
const { chartTheme, tooltipStyle } = useChartTheme();
const throughput = useMemo(() => getThroughputData(tasks ?? [], range), [tasks, range]);

<ChartContainer title="Throughput" description="Tasks created vs completed per week">
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={throughput} margin={chartTheme.margin}>
      <CartesianGrid {...chartTheme.grid} />
      <XAxis dataKey="week" tick={chartTheme.axisTick} />
      <YAxis tick={chartTheme.axisTick} />
      <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursorFill} />
      <Bar dataKey="created" fill={chartTheme.series.primary} />
      <Bar dataKey="completed" fill={chartTheme.series.secondary} />
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>
```

The `useChartTheme()` hook provides memoized, theme-aware chart configuration. It reads from `ThemeContext` and returns values appropriate for the active light/dark theme.

## Charts by Page

### Trends Page

| Chart | Type | Data Function | Series |
|-------|------|---------------|--------|
| Throughput | BarChart | `getThroughputData()` | created (primary), completed (secondary) |
| Velocity | ComposedChart | `getVelocityData()` | completed bar (primary), average line (quaternary) |
| Aging Distribution | BarChart (stacked) | `getAgingDistribution()` | high/medium/low importance |
| Calendar Heatmap | Custom | `getCalendarHeatmapData()` | Intensity-based coloring |

### Projects & Areas Page

| Chart | Type | Data Function | Series |
|-------|------|---------------|--------|
| Project Health | BarChart (stacked, horizontal) | `getProjectHealth()` | 5 status colors |
| Area Workload | BarChart (stacked, vertical) | Custom grouping | Area-specific colors |

## Theming

Charts automatically adapt to the active theme via the `useChartTheme()` hook. See [[chart-theming]] for the complete configuration, series colors, tooltip styling, and domain color maps.

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
