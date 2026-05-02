---
parent: "[[design-system-moc]]"
tags:
  - design
  - typography
  - fonts
related:
  - "[[colors-and-tokens]]"
---

# Typography

## Primary Font: Inter Variable

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

## OpenType Features

```css
body {
  font-feature-settings: "cv01", "ss03";
}
```

- `cv01` — Alternative numeral forms
- `ss03` — Stylistic alternates (simpler lowercase 'a')

## Font Smoothing

Enabled globally for crisp rendering on macOS:

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

## Weight System

| Weight | Tailwind Class | Usage |
|--------|---------------|-------|
| 400 | `font-normal` | Body text, descriptions |
| 510 | `font-[510]` | UI standard — nav links, labels, buttons, card titles |
| 590 | `font-[590]` | Strong emphasis — stat values, hero numbers |

The signature weight `510` is used extensively — it provides slightly more presence than regular without being bold.

## Size Scale

Commonly used sizes in the codebase:

| Size | Usage |
|------|-------|
| `text-[12px]` | Small labels, badges, button (sm) |
| `text-[13px]` | Body text, nav links, button (md) |
| `text-[14px]` | Card titles, sidebar title, button (lg) |
| `text-[22px]` | Stat card values |
| `text-[28px]` | Page headings |

## Letter Spacing

Headings and large text use negative letter-spacing for tighter, more polished appearance:

```html
<h1 class="tracking-[-0.01em]">  <!-- Subtle tightening -->
<h2 class="tracking-[-0.02em]">  <!-- Moderate tightening -->
```

See `/DESIGN.md` Section 3 for the complete type scale table with exact pixel sizes and tracking values at each display size.
