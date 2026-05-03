---
parent: "[[App]]"
tags:
related:
  - "[[Component Architecture]]"
  - "[[Charting]]"
---

# Design System

Comprehensive design system inspired by Linear. Dark-mode-native with Inter Variable typography and a single brand accent color.

**Sources:** `app/src/app.css`, `app/src/lib/chart-theme.ts`, `app/src/lib/constants.ts`, `app/src/components/ui/`, `app/src/components/layout/`, `app/DESIGN.md`

## Colors & Tokens

All design tokens are defined as CSS custom properties in `app/src/app.css` using Tailwind 4's `@theme` directive.

### Background Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#08090a` | Page background |
| `--color-surface-panel` | `#0f1011` | Sidebar, panels |
| `--color-surface-elevated` | `#191a1b` | Cards, tooltips, elevated elements |
| `--color-surface-hover` | `#28282c` | Hover states on surface elements |

### Foreground Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--color-foreground` | `#f7f8f8` | Primary text, headings |
| `--color-foreground-secondary` | `#d0d6e0` | Body text, labels |
| `--color-foreground-tertiary` | `#8a8f98` | Captions, placeholders, axis labels |
| `--color-foreground-quaternary` | `#62666d` | Disabled text, hints |

### Accent

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#5e6ad2` | Brand indigo, primary buttons, active states |
| `--color-accent-light` | `#7170ff` | Chart series, lighter accent uses |
| `--color-accent-hover` | `#828fff` | Hover state on accent elements |
| `--color-accent-foreground` | `#ffffff` | Text on accent backgrounds |

### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border` | `rgba(255, 255, 255, 0.08)` | Default borders |
| `--color-border-subtle` | `rgba(255, 255, 255, 0.05)` | Subtle separators |
| `--color-border-solid` | `#23252a` | Solid borders for non-transparent contexts |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#27a644` | Done tasks, positive indicators |
| `--color-success-light` | `#10b981` | Lighter green variant |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small elements, badges |
| `--radius-md` | `6px` | Buttons, inputs |
| `--radius-lg` | `8px` | Cards (default) |
| `--radius-xl` | `12px` | Elevated cards |
| `--radius-pill` | `9999px` | Pill buttons, fully rounded |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-subtle` | `0px 1.2px 0px 0px rgba(0,0,0,0.03)` | Subtle elevation |
| `--shadow-ring` | `0px 0px 0px 1px rgba(0,0,0,0.2)` | Ring outline |
| `--shadow-elevated` | `0px 2px 4px rgba(0,0,0,0.4)` | Elevated surfaces |
| `--shadow-dialog` | Multi-layer | Dialog/modal backdrop |

### Tailwind Usage

Tokens are referenced via Tailwind utility classes:

```html
<div class="bg-background text-foreground border-border rounded-[var(--radius-lg)]">
<button class="bg-accent text-accent-foreground hover:bg-accent-hover">
<p class="text-foreground-secondary">
```

### Inline RGBA Patterns

Some component-level styles use inline RGBA values for fine-grained opacity control not captured by tokens:

- `bg-[rgba(255,255,255,0.02)]` — Very subtle surface
- `bg-[rgba(255,255,255,0.04)]` — Elevated surface variant
- `bg-[rgba(255,255,255,0.06)]` — Active/selected state

## Typography

### Primary Font: Inter Variable

Self-hosted variable font loaded from `/fonts/InterVariable.woff2`.

```css
@font-face {
  font-family: "Inter Variable";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/InterVariable.woff2") format("woff2");
}
```

### Font Stack

```css
--font-sans: "Inter Variable", "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, "Cascadia Code", monospace;
```

### OpenType Features

```css
body {
  font-feature-settings: "cv01", "ss03";
}
```

- `cv01` — Alternative numeral forms
- `ss03` — Stylistic alternates (simpler lowercase 'a')

### Font Smoothing

Enabled globally for crisp rendering on macOS:

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Weight System

| Weight | Tailwind Class | Usage |
|--------|---------------|-------|
| 400 | `font-normal` | Body text, descriptions |
| 510 | `font-[510]` | UI standard — nav links, labels, buttons, card titles |
| 590 | `font-[590]` | Strong emphasis — stat values, hero numbers |

The signature weight `510` is used extensively — it provides slightly more presence than regular without being bold.

### Size Scale

| Size | Usage |
|------|-------|
| `text-[12px]` | Small labels, badges, button (sm) |
| `text-[13px]` | Body text, nav links, button (md) |
| `text-[14px]` | Card titles, sidebar title, button (lg) |
| `text-[22px]` | Stat card values |
| `text-[28px]` | Page headings |

### Letter Spacing

Headings and large text use negative letter-spacing for tighter, more polished appearance:

```html
<h1 class="tracking-[-0.01em]">  <!-- Subtle tightening -->
<h2 class="tracking-[-0.02em]">  <!-- Moderate tightening -->
```

## UI Components

Custom-built primitive components using Tailwind CSS. No external component library (no Radix, shadcn, or Headless UI).

**Source:** `app/src/components/ui/`

All components use the `cn()` utility (clsx + tailwind-merge) for class composition.

### Button

**Source:** `app/src/components/ui/Button.tsx`

A polymorphic button with variant and size props.

#### Variants

| Variant | Appearance |
|---------|------------|
| `ghost` | Transparent with solid border, secondary text |
| `primary` | Accent background, white text |
| `subtle` | Very faint background, secondary text |
| `pill` | Transparent with border, fully rounded |
| `icon` | Circular, faint background |

#### Sizes

| Size | Padding | Font Size |
|------|---------|-----------|
| `sm` | px-2.5 py-1 | 12px |
| `md` | px-4 py-2 | 13px |
| `lg` | px-5 py-2.5 | 14px |

#### Base Styles

- `font-[510]` weight
- `rounded-[6px]` (except pill and icon)
- 150ms color transition
- Focus-visible ring (accent color)
- Disabled: 50% opacity, no pointer events

#### Usage

```tsx
<Button variant="primary" size="md">Save</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="icon"><RefreshCw size={16} /></Button>
```

### Card

**Source:** `app/src/components/ui/Card.tsx`

Composable card container with sub-components.

#### Variants

| Variant | Background | Radius |
|---------|------------|--------|
| `default` | `rgba(255,255,255,0.02)` | 8px |
| `elevated` | `rgba(255,255,255,0.04)` | 12px |

#### Sub-components

| Component | Styles | Purpose |
|-----------|--------|---------|
| `CardHeader` | px-5 pt-5 pb-1 | Top section with title |
| `CardTitle` | 14px font-[510] | Card heading |
| `CardDescription` | 13px tertiary text | Subtitle/explanation |
| `CardContent` | p-5 pt-4 | Main content area |

#### Usage

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Health</CardTitle>
    <CardDescription>Status breakdown by project</CardDescription>
  </CardHeader>
  <CardContent>{/* charts, tables, etc */}</CardContent>
</Card>
```

### Badge

**Source:** `app/src/components/ui/Badge.tsx`

Status and category indicators with color variants.

### Input

**Source:** `app/src/components/ui/Input.tsx`

Text input primitive with Tailwind styling matching the design system.

### Exports

All UI components are re-exported from `app/src/components/ui/index.ts` for convenient importing:

```typescript
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Input } from "@/components/ui";
```

## Layout System

The application uses a fixed sidebar + scrollable content layout pattern.

**Source:** `app/src/components/layout/`

### AppShell

**Source:** `app/src/components/layout/AppShell.tsx`

The root layout wrapper used by all authenticated routes.

```
+---------------------------------------------+
| +----------+ +----------------------------+ |
| |          | |         Header             | |
| |          | +----------------------------+ |
| | Sidebar  | |                            | |
| | (w-56)   | |    Main Content Area       | |
| |          | |    (max-w-[1200px])        | |
| |          | |    (px-8 py-8)            | |
| |          | |                            | |
| +----------+ +----------------------------+ |
+---------------------------------------------+
```

Structure:
- `flex h-screen bg-background` — Full viewport height, dark background
- Sidebar — Fixed width on the left
- Content column — `flex-1 flex-col overflow-hidden`
  - Header — Top bar
  - Main — `flex-1 overflow-y-auto px-8 py-8` with centered `max-w-[1200px]` content

### Sidebar

**Source:** `app/src/components/layout/Sidebar.tsx`

Fixed-width navigation panel.

| Property | Value |
|----------|-------|
| Width | `w-56` (224px) |
| Background | `bg-surface-panel` |
| Border | Right `border-border-subtle` |
| Padding | `px-3 py-4` |

#### Navigation Links

| Route | Label | Icon |
|-------|-------|------|
| `/` | This Week | CalendarDays |
| `/trends` | Trends | TrendingUp |
| `/projects` | Projects & Areas | FolderKanban |
| `/settings` | Settings | Settings |

#### Active State

```typescript
isActive
  ? "bg-[rgba(255,255,255,0.06)] text-foreground"
  : "text-foreground-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground"
```

#### Icon Sizing

All nav icons: `size={16} strokeWidth={1.5}` (Lucide React)

#### Footer

Logout button at the bottom with `LogOut` icon, styled as tertiary text.

### Header

**Source:** `app/src/components/layout/Header.tsx`

Minimal top bar component. Currently displays the application title.

### Content Grid Patterns

Pages use responsive grid layouts for stat cards and project cards:

```html
<!-- Stat cards: responsive 1->2->5 columns -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

<!-- Project cards: responsive 1->2->3 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
```

## Chart Theming

Consistent visual styling for all Recharts visualizations.

**Source:** `app/src/lib/chart-theme.ts`, `app/src/lib/constants.ts`

### CHART_THEME Object

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

### Series Colors

Used for chart lines, bars, and areas:

| Name | Color | Typical Use |
|------|-------|-------------|
| primary | `#5e6ad2` | Created tasks, default series |
| secondary | `#27a644` | Completed tasks, positive metrics |
| tertiary | `#7170ff` | In Progress, secondary data |
| quaternary | `#828fff` | Rolling averages, subtle series |
| warning | `#d97706` | Deferred, at-risk indicators |

### TOOLTIP_STYLE

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

### Domain Color Maps

#### STATUS_COLORS

| Status | Color |
|--------|-------|
| Not Started | `#6b7280` (gray) |
| In Progress | `#5e6ad2` (accent) |
| Done | `#27a644` (green) |
| Cancelled | `#dc2626` (red) |
| Deferred | `#d97706` (amber) |

#### PRIORITY_COLORS

| Priority | Color |
|----------|-------|
| High | `#ef4444` (red) |
| Medium | `#d97706` (amber) |
| Low | `#6b7280` (gray) |

#### AREA_COLORS

Named area colors with a hash-based fallback palette for unknown areas:

```typescript
function getAreaColor(name: string): string {
  return AREA_COLORS[name] ?? AREA_PALETTE[hashString(name) % AREA_PALETTE.length];
}
```

### CSS Override

Grid lines are styled globally in `app/src/app.css` to match the theme:

```css
.recharts-cartesian-grid-horizontal line,
.recharts-cartesian-grid-vertical line {
  stroke: rgba(255, 255, 255, 0.05);
}
```
