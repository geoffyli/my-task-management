---
parent: "[[design-system-moc]]"
tags:
  - design
  - colors
  - tokens
  - tailwind
  - theming
related:
  - "[[typography]]"
  - "[[ui-components]]"
  - "[[chart-theming]]"
---

# Colors & Design Tokens

All design tokens are defined as CSS custom properties in `src/app.css`. The system supports light and dark themes through a `data-theme` attribute on `<html>`.

**Source:** `src/app.css`

## Theme Architecture

Tokens use a two-layer indirection:

1. **`@theme inline` block** — Registers Tailwind utility names pointing to `var(--theme-*)` references
2. **`:root` / `[data-theme="dark"]` blocks** — Define the actual `--theme-*` values per theme

This lets Tailwind utilities like `bg-background` resolve at runtime based on the active theme.

```css
@theme inline {
  --color-background: var(--theme-background);
  /* ... */
}

:root {
  --theme-background: #fbfbfc;  /* Light */
}
[data-theme="dark"] {
  --theme-background: #08090a;  /* Dark */
}
```

## Background Surfaces

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--color-background` | `#08090a` | `#fbfbfc` | Page background |
| `--color-surface-panel` | `#0f1011` | `#f3f4f6` | Sidebar, panels |
| `--color-surface-elevated` | `#191a1b` | `#ffffff` | Cards, tooltips, elevated elements |
| `--color-surface-hover` | `#28282c` | `#edeef1` | Hover states on surface elements |
| `--color-surface-card` | `rgba(255,255,255,0.02)` | `rgba(0,0,0,0.02)` | Subtle card backgrounds |
| `--color-surface-input` | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.02)` | Input/control backgrounds |
| `--color-interactive-hover` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` | Interactive element hover |
| `--color-interactive-active` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` | Active/selected states |

## Foreground Hierarchy

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--color-foreground` | `#f7f8f8` | `#1c1f26` | Primary text, headings |
| `--color-foreground-secondary` | `#d0d6e0` | `#3c4049` | Body text, labels |
| `--color-foreground-tertiary` | `#8a8f98` | `#6b7280` | Captions, placeholders, axis labels |
| `--color-foreground-quaternary` | `#62666d` | `#9ca3af` | Disabled text, hints |

## Accent

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--color-accent` | `#5e6ad2` | `#5e6ad2` | Brand indigo, primary buttons |
| `--color-accent-light` | `#7170ff` | `#5e6ad2` | Chart series, lighter accent |
| `--color-accent-hover` | `#828fff` | `#4f5bc4` | Hover state on accent elements |
| `--color-accent-foreground` | `#ffffff` | `#ffffff` | Text on accent backgrounds |

## Borders

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--color-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Default borders |
| `--color-border-subtle` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.05)` | Subtle separators |
| `--color-border-solid` | `#23252a` | `#e2e4e9` | Solid borders |

## Status Colors

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--color-success` | `#27a644` | `#16a34a` | Done tasks, positive indicators |
| `--color-success-light` | `#10b981` | `#10b981` | Lighter green variant |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small elements, badges |
| `--radius-md` | `6px` | Buttons, inputs |
| `--radius-lg` | `8px` | Cards (default) |
| `--radius-xl` | `12px` | Elevated cards |
| `--radius-pill` | `9999px` | Pill buttons, fully rounded |

## Shadows

Shadows also adapt per theme (lighter in light mode, deeper in dark mode):

| Token | Usage |
|-------|-------|
| `--shadow-subtle` | Subtle elevation |
| `--shadow-ring` | Ring outline |
| `--shadow-elevated` | Elevated surfaces |
| `--shadow-dialog` | Dialog/modal backdrop |

## Tailwind Usage

Tokens are referenced via Tailwind utility classes:

```html
<div class="bg-background text-foreground border-border rounded-lg">
<button class="bg-accent text-accent-foreground hover:bg-accent-hover">
<div class="bg-surface-card hover:bg-interactive-hover">
```
