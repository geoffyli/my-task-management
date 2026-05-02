---
parent: "[[index]]"
tags:
  - tech-stack
  - dependencies
related:
  - "[[architecture-overview]]"
  - "[[getting-started]]"
---

# Technology Stack

## Runtime

| Technology | Version | Role |
|-----------|---------|------|
| Bun | latest | JavaScript runtime, package manager, bundler |

Bun provides built-in SQLite (`bun:sqlite`), fast startup, and native TypeScript execution without a compile step.

## Backend

| Technology | Version | Role |
|-----------|---------|------|
| Hono | ^4.12.15 | Lightweight HTTP framework (Web Standard API) |
| bun:sqlite | built-in | Database driver with WAL mode |

## Frontend

| Technology | Version | Role |
|-----------|---------|------|
| React | ^19.2.5 | UI framework |
| React DOM | ^19.2.5 | DOM rendering |
| React Router DOM | ^7.14.2 | Client-side routing |
| TanStack React Query | ^5.100.6 | Server state management and caching |
| Recharts | ^3.8.1 | Data visualization (charts) |
| Lucide React | ^1.14.0 | Icon library |
| date-fns | ^4.1.0 | Date utility functions |
| clsx | ^2.1.1 | Conditional class names |
| tailwind-merge | ^3.5.0 | Tailwind class deduplication |

## Build & Development

| Technology | Version | Role |
|-----------|---------|------|
| Vite | ^8.0.10 | Frontend build tool and dev server |
| TypeScript | ^5.9.3 | Type system (strict mode) |
| Tailwind CSS | ^4.2.4 | Utility-first CSS framework |
| @tailwindcss/vite | ^4.2.4 | Vite integration for Tailwind 4 |
| @vitejs/plugin-react | ^6.0.1 | React JSX transform for Vite |
| PostCSS | ^8.5.12 | CSS processing pipeline |
| Autoprefixer | ^10.5.0 | Vendor prefix automation |

## External Services

| Service | Role |
|---------|------|
| Notion API (v2025-09-03) | Data source for tasks, projects, and areas |

## Fonts

| Font | Format | Usage |
|------|--------|-------|
| Inter Variable | woff2 (self-hosted at `/fonts/`) | Primary UI typeface |

## Key Design Decisions

- **No ORM** — Raw SQL via `bun:sqlite` for simplicity and performance
- **No external UI library** — Custom components built with Tailwind for full design control
- **No global state library** — React Query for server state, Context API for auth
- **Client-side metrics** — All analytics computed in the browser from the full dataset
- **Single container** — One Bun process serves both compiled frontend and API
