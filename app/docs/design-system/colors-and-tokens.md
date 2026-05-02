---
parent: "[[design-system-moc]]"
tags:
  - design
  - colors
  - tokens
  - tailwind
related:
  - "[[typography]]"
  - "[[ui-components]]"
---

# Colors & Design Tokens

All design tokens are defined as CSS custom properties in `src/app.css` using Tailwind 4's `@theme` directive.

**Source:** `src/app.css`

## Background Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#08090a` | Page background |
| `--color-surface-panel` | `#0f1011` | Sidebar, panels |
| `--color-surface-elevated` | `#191a1b` | Cards, tooltips, elevated elements |
| `--color-surface-hover` | `#28282c` | Hover states on surface elements |

## Foreground Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--color-foreground` | `#f7f8f8` | Primary text, headings |
| `--color-foreground-secondary` | `#d0d6e0` | Body text, labels |
| `--color-foreground-tertiary` | `#8a8f98` | Captions, placeholders, axis labels |
| `--color-foreground-quaternary` | `#62666d` | Disabled text, hints |

## Accent

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#5e6ad2` | Brand indigo, primary buttons, active states |
| `--color-accent-light` | `#7170ff` | Chart series, lighter accent uses |
| `--color-accent-hover` | `#828fff` | Hover state on accent elements |
| `--color-accent-foreground` | `#ffffff` | Text on accent backgrounds |

## Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border` | `rgba(255, 255, 255, 0.08)` | Default borders |
| `--color-border-subtle` | `rgba(255, 255, 255, 0.05)` | Subtle separators |
| `--color-border-solid` | `#23252a` | Solid borders for non-transparent contexts |

## Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#27a644` | Done tasks, positive indicators |
| `--color-success-light` | `#10b981` | Lighter green variant |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small elements, badges |
| `--radius-md` | `6px` | Buttons, inputs |
| `--radius-lg` | `8px` | Cards (default) |
| `--radius-xl` | `12px` | Elevated cards |
| `--radius-pill` | `9999px` | Pill buttons, fully rounded |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-subtle` | `0px 1.2px 0px 0px rgba(0,0,0,0.03)` | Subtle elevation |
| `--shadow-ring` | `0px 0px 0px 1px rgba(0,0,0,0.2)` | Ring outline |
| `--shadow-elevated` | `0px 2px 4px rgba(0,0,0,0.4)` | Elevated surfaces |
| `--shadow-dialog` | Multi-layer | Dialog/modal backdrop |

## Tailwind Usage

Tokens are referenced via Tailwind utility classes:

```html
<div class="bg-background text-foreground border-border rounded-[var(--radius-lg)]">
<button class="bg-accent text-accent-foreground hover:bg-accent-hover">
<p class="text-foreground-secondary">
```

## Inline RGBA Patterns

Some component-level styles use inline RGBA values for fine-grained opacity control not captured by tokens:

- `bg-[rgba(255,255,255,0.02)]` — Very subtle surface
- `bg-[rgba(255,255,255,0.04)]` — Elevated surface variant
- `bg-[rgba(255,255,255,0.06)]` — Active/selected state
