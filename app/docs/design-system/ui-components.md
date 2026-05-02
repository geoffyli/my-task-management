---
parent: "[[design-system-moc]]"
tags:
  - design
  - components
  - ui
related:
  - "[[colors-and-tokens]]"
  - "[[component-architecture]]"
---

# UI Components

Custom-built primitive components using Tailwind CSS. No external component library (no Radix, shadcn, or Headless UI).

**Source:** `src/components/ui/`

All components use the `cn()` utility (clsx + tailwind-merge) for class composition.

## Button

**Source:** `src/components/ui/Button.tsx`

A polymorphic button with variant and size props.

### Variants

| Variant | Appearance |
|---------|------------|
| `ghost` | Transparent with solid border, secondary text |
| `primary` | Accent background, white text |
| `subtle` | Very faint background, secondary text |
| `pill` | Transparent with border, fully rounded |
| `icon` | Circular, faint background |

### Sizes

| Size | Padding | Font Size |
|------|---------|-----------|
| `sm` | px-2.5 py-1 | 12px |
| `md` | px-4 py-2 | 13px |
| `lg` | px-5 py-2.5 | 14px |

### Base Styles

- `font-[510]` weight
- `rounded-[6px]` (except pill and icon)
- 150ms color transition
- Focus-visible ring (accent color)
- Disabled: 50% opacity, no pointer events

### Usage

```tsx
<Button variant="primary" size="md">Save</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="icon"><RefreshCw size={16} /></Button>
```

## Card

**Source:** `src/components/ui/Card.tsx`

Composable card container with sub-components.

### Variants

| Variant | Background | Radius |
|---------|------------|--------|
| `default` | `rgba(255,255,255,0.02)` | 8px |
| `elevated` | `rgba(255,255,255,0.04)` | 12px |

### Sub-components

| Component | Styles | Purpose |
|-----------|--------|---------|
| `CardHeader` | px-5 pt-5 pb-1 | Top section with title |
| `CardTitle` | 14px font-[510] | Card heading |
| `CardDescription` | 13px tertiary text | Subtitle/explanation |
| `CardContent` | p-5 pt-4 | Main content area |

### Usage

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Health</CardTitle>
    <CardDescription>Status breakdown by project</CardDescription>
  </CardHeader>
  <CardContent>{/* charts, tables, etc */}</CardContent>
</Card>
```

## Badge

**Source:** `src/components/ui/Badge.tsx`

Status and category indicators with color variants.

## Input

**Source:** `src/components/ui/Input.tsx`

Text input primitive with Tailwind styling matching the design system.

## Exports

All UI components are re-exported from `src/components/ui/index.ts` for convenient importing:

```typescript
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Input } from "@/components/ui";
```
