---
parent: "[[frontend-moc]]"
tags:
  - frontend
  - components
  - architecture
related:
  - "[[ui-components]]"
  - "[[layout-system]]"
  - "[[pages]]"
---

# Component Architecture

Organization patterns and composition approach for the React frontend.

## Directory Structure

```
src/components/
├── layout/           # Structural shell components
│   ├── AppShell.tsx    (flex container: sidebar + content)
│   ├── Header.tsx      (top bar)
│   └── Sidebar.tsx     (navigation panel)
├── ui/               # Design-system primitives
│   ├── Button.tsx      (variant + size polymorphic button)
│   ├── Card.tsx        (composable card with sub-components)
│   ├── Badge.tsx       (status/category indicator)
│   ├── Input.tsx       (text input)
│   └── index.ts        (barrel export)
├── cards/            # Domain-specific card components
│   └── StatCard.tsx    (metric display with icon, value, trend)
└── shared/           # Reusable non-primitive components
    ├── ChartContainer.tsx    (card frame for charts with title/export)
    ├── TimeRangeSelector.tsx (segmented time filter control)
    ├── LoadingState.tsx      (centered loading indicator)
    ├── EmptyState.tsx        (no-data message)
    └── ErrorFallback.tsx     (error display with retry)
```

## Component Categories

### Primitives (`ui/`)

Low-level building blocks with no domain knowledge. Accept `variant`, `size`, and standard HTML props. Re-exported from barrel file.

### Layout (`layout/`)

Structural components that define the page skeleton. Used once in the app root.

### Shared (`shared/`)

Reusable domain-aware components used across multiple pages. Understand the app's data patterns but aren't tied to a specific page.

### Cards (`cards/`)

Specialized display components for metrics and data summaries.

## Composition Patterns

### Pages Compose Everything

Pages (`src/pages/*.tsx`) are the highest-level composition layer:

```tsx
// Pattern: page fetches data, computes metrics, renders composed UI
function TrendsPage() {
  const { data: tasks } = useTasks();
  const throughput = useMemo(() => getThroughputData(tasks, range), [tasks, range]);
  
  return (
    <div>
      <TimeRangeSelector />      {/* shared */}
      <ChartContainer title="...">  {/* shared */}
        <BarChart data={throughput}> {/* recharts */}
          ...
        </BarChart>
      </ChartContainer>
    </div>
  );
}
```

### Class Composition via `cn()`

All components use `cn()` for merging Tailwind classes:

```typescript
// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

This enables:
- Conditional classes via clsx
- Duplicate Tailwind class resolution via tailwind-merge
- Consumer className prop override

### ForwardRef Pattern

`Button` uses `forwardRef` for DOM ref access:

```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(baseStyles, variantStyles[variant], className)} {...props} />
  )
);
```

## Path Aliases

All imports use the `@/` path alias (configured in both `tsconfig.json` and `vite.config.ts`):

```typescript
import { Button } from "@/components/ui";
import { useTasks } from "@/api/queries";
import { CHART_THEME } from "@/lib/chart-theme";
```

## No Chart Components Directory

Charts are rendered inline within page components using Recharts directly. The `shared/ChartContainer` provides the frame, but chart content (axes, bars, lines) is defined in the page.
