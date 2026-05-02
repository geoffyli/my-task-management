---
parent: "[[design-system-moc]]"
tags:
  - design
  - layout
  - structure
related:
  - "[[component-architecture]]"
  - "[[colors-and-tokens]]"
---

# Layout System

The application uses a fixed sidebar + scrollable content layout pattern.

**Source:** `src/components/layout/`

## AppShell

**Source:** `src/components/layout/AppShell.tsx`

The root layout wrapper used by all authenticated routes.

```
┌─────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────┐ │
│ │          │ │         Header             │ │
│ │          │ ├────────────────────────────┤ │
│ │ Sidebar  │ │                            │ │
│ │ (w-56)   │ │    Main Content Area       │ │
│ │          │ │    (max-w-[1200px])        │ │
│ │          │ │    (px-8 py-8)            │ │
│ │          │ │                            │ │
│ └──────────┘ └────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

Structure:
- `flex h-screen bg-background` — Full viewport height, dark background
- Sidebar — Fixed width on the left
- Content column — `flex-1 flex-col overflow-hidden`
  - Header — Top bar
  - Main — `flex-1 overflow-y-auto px-8 py-8` with centered `max-w-[1200px]` content

## Sidebar

**Source:** `src/components/layout/Sidebar.tsx`

Fixed-width navigation panel.

| Property | Value |
|----------|-------|
| Width | `w-56` (224px) |
| Background | `bg-surface-panel` |
| Border | Right `border-border-subtle` |
| Padding | `px-3 py-4` |

### Navigation Links

| Route | Label | Icon |
|-------|-------|------|
| `/` | This Week | CalendarDays |
| `/trends` | Trends | TrendingUp |
| `/projects` | Projects & Areas | FolderKanban |
| `/settings` | Settings | Settings |

### Active State

```typescript
isActive
  ? "bg-[rgba(255,255,255,0.06)] text-foreground"
  : "text-foreground-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground"
```

### Icon Sizing

All nav icons: `size={16} strokeWidth={1.5}` (Lucide React)

### Footer

Logout button at the bottom with `LogOut` icon, styled as tertiary text.

## Header

**Source:** `src/components/layout/Header.tsx`

Minimal top bar component. Currently displays the application title.

## Content Grid Patterns

Pages use responsive grid layouts for stat cards and project cards:

```html
<!-- Stat cards: responsive 1→2→5 columns -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

<!-- Project cards: responsive 1→2→3 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
```
