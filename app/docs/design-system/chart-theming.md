---
parent: "[[design-system-moc]]"
tags:
  - design
  - charts
  - theming
related:
  - "[[charting]]"
  - "[[colors-and-tokens]]"
---

# Chart Theming

Consistent visual styling for all Recharts visualizations, adapting automatically to light and dark themes.

**Source:** `src/lib/chart-theme.ts`, `src/lib/constants.ts`, `src/hooks/useChartTheme.ts`

## Theme-Aware Chart Configuration

Chart styling is provided by `getChartTheme(theme)` which returns theme-appropriate values for axes, grids, cursors, and legends. The `useChartTheme()` hook wraps this with memoization:

```typescript
// src/hooks/useChartTheme.ts
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const chartTheme = useMemo(() => getChartTheme(resolvedTheme), [resolvedTheme]);
  const tooltipStyle = useMemo(() => getTooltipStyle(resolvedTheme), [resolvedTheme]);
  return { chartTheme, tooltipStyle };
}
```

### Usage in Pages

```typescript
function TrendsPage() {
  const { chartTheme, tooltipStyle } = useChartTheme();

  return (
    <BarChart margin={chartTheme.margin}>
      <CartesianGrid {...chartTheme.grid} />
      <XAxis tick={chartTheme.axisTick} axisLine={chartTheme.axisLine} />
      <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursorFill} />
    </BarChart>
  );
}
```

## Chart Theme Properties

| Property | Dark Value | Light Value | Purpose |
|----------|-----------|-------------|---------|
| `axisTick.fill` | `#8a8f98` | `#6b7280` | Axis label color |
| `axisLine.stroke` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.06)` | Axis line color |
| `grid.stroke` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.06)` | Grid line color |
| `cursor.stroke` | `rgba(255,255,255,0.1)` | `rgba(0,0,0,0.1)` | Hover cursor line |
| `cursorFill.fill` | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.03)` | Hover cursor fill |
| `legend.color` | `#d0d6e0` | `#3c4049` | Legend text color |

Margins and series colors are theme-independent.

## Series Colors

Used for chart lines, bars, and areas (same in both themes):

| Name | Color | Typical Use |
|------|-------|-------------|
| primary | `#5e6ad2` | Created tasks, default series |
| secondary | `#27a644` | Completed tasks, positive metrics |
| tertiary | `#7170ff` | In Progress, secondary data |
| quaternary | `#828fff` | Rolling averages, subtle series |
| warning | `#d97706` | Blocked, at-risk indicators |

## Tooltip Style

Provided by `getTooltipStyle(theme)`:

| Property | Dark | Light |
|----------|------|-------|
| background | `#191a1b` | `#ffffff` |
| border | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| color | `#d0d6e0` | `#3c4049` |

## Domain Color Maps

These remain constant across themes (sufficient contrast on both backgrounds):

### STATUS_COLORS

| Status | Color |
|--------|-------|
| Not Started | `#6b7280` (gray) |
| In Progress | `#5e6ad2` (accent) |
| Done | `#27a644` (green) |
| Cancelled | `#dc2626` (red) |
| Blocked | `#d97706` (amber) |

### IMPORTANCE_COLORS

| Importance | Color |
|----------|-------|
| High | `#ef4444` (red) |
| Medium | `#d97706` (amber) |
| Low | `#6b7280` (gray) |

### AREA_COLORS

Named area colors with a hash-based fallback palette for unknown areas:

```typescript
function getAreaColor(name: string): string {
  return AREA_COLORS[name] ?? AREA_PALETTE[hashString(name) % AREA_PALETTE.length];
}
```

## CSS Override

Grid lines are styled globally in `src/app.css`, scoped by theme:

```css
[data-theme="dark"] .recharts-cartesian-grid-horizontal line { stroke: rgba(255,255,255,0.05); }
[data-theme="light"] .recharts-cartesian-grid-horizontal line { stroke: rgba(0,0,0,0.06); }
```
