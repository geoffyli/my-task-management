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

Consistent visual styling for all Recharts visualizations.

**Source:** `src/lib/chart-theme.ts`, `src/lib/constants.ts`

## CHART_THEME Object

```typescript
const CHART_THEME = {
  axisTick:    { fontSize: 11, fill: "#8a8f98", fontWeight: 510 },
  axisTickSm:  { fontSize: 10, fill: "#8a8f98", fontWeight: 510 },
  axisLine:    { stroke: "rgba(255,255,255,0.05)" },
  grid:        { stroke: "rgba(255,255,255,0.05)", strokeDasharray: "2 4" },
  margin:      { top: 5, right: 5, left: -10, bottom: 5 },
  marginWide:  { top: 5, right: 20, left: 120, bottom: 5 },
  marginArea:  { top: 5, right: 20, left: 20, bottom: 5 },
  cursor:      { stroke: "rgba(255,255,255,0.1)" },
  cursorFill:  { fill: "rgba(255,255,255,0.03)" },
  legend:      { fontSize: 12, fontWeight: 510, color: "#d0d6e0" },
  series: {
    primary:    "#5e6ad2",   // Accent indigo
    secondary:  "#27a644",   // Success green
    tertiary:   "#7170ff",   // Accent light
    quaternary: "#828fff",   // Accent hover
    warning:    "#d97706",   // Amber/orange
  },
};
```

## Series Colors

Used for chart lines, bars, and areas:

| Name | Color | Typical Use |
|------|-------|-------------|
| primary | `#5e6ad2` | Created tasks, default series |
| secondary | `#27a644` | Completed tasks, positive metrics |
| tertiary | `#7170ff` | In Progress, secondary data |
| quaternary | `#828fff` | Rolling averages, subtle series |
| warning | `#d97706` | Deferred, at-risk indicators |

## TOOLTIP_STYLE

Shared tooltip styling applied to Recharts `<Tooltip>` components:

```typescript
const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 510,
  background: "#191a1b",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#d0d6e0",
};
```

## Domain Color Maps

### STATUS_COLORS

| Status | Color |
|--------|-------|
| Not Started | `#6b7280` (gray) |
| In Progress | `#5e6ad2` (accent) |
| Done | `#27a644` (green) |
| Cancelled | `#dc2626` (red) |
| Deferred | `#d97706` (amber) |

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

Grid lines are styled globally in `src/app.css` to match the theme:

```css
.recharts-cartesian-grid-horizontal line,
.recharts-cartesian-grid-vertical line {
  stroke: rgba(255, 255, 255, 0.05);
}
```
