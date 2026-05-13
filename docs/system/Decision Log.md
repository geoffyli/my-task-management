---
parent: "[[System]]"
tags:
  - reference
related:
  - "[[Architecture]]"
  - "[[Task Lifecycle]]"
---

# Decision Log

Collected design decisions across the system. Each entry records what was decided, why, and where the detailed rationale lives.

## Architecture Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| SQLite over Postgres | Single-node deployment, simpler ops, WAL mode handles read-heavy dashboard workload | [[Architecture]] |
| Monorepo structure | Shared documentation and coordinated deployment for tightly coupled systems | [[Architecture]] |
| Single Bun process for App | Simplifies deployment — one container serves API + static React build | [[Architecture]] |
| No ORM (raw SQL) | Clarity over abstraction; schema is small and stable | [[Architecture]] |
| Raw JSON preservation in `pages` table | Allows re-extraction if denormalization schema changes without re-syncing from Notion | [[Database Schema]] |

## Sync & Webhook Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Three-layer sync (full + reconciliation + webhooks) | Webhooks for speed, reconciliation for reliability, full sync for recovery | [[Sync Strategy]] |
| Always return 200 to Notion webhooks | Prevents retry storms that cause duplicate processing | [[Webhook Handler]] |
| Single webhook router over per-property scripts | One entry point reduces Notion webhook configuration; preprocessor filters cheaply | [[Tasks Webhook Router]] |
| HMAC verification for App webhooks | Security — validates events genuinely come from Notion | [[Webhook Handler]] |
| Soft deletes over hard deletes | Preserves audit trail; allows undo detection via `page.undeleted` events | [[Database Schema]] |

## Task Lifecycle Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Five states (Not Started, In Progress, Blocked, Done, Cancelled) | Blocked and Cancelled have distinct behaviors — Blocked pauses without resetting, Cancelled closes without success metrics inflation | [[Task Lifecycle]] |
| Initial Assigned Date removed | Reschedule metric never drove behavior change; field eliminated with all related automation, health rules, and analytics (2026-05-13) | [[Task Lifecycle]] |
| Closed Date covers both Done and Cancelled | Both represent leaving the active pool; Status field already distinguishes outcome | [[Task Lifecycle]] |
| View-based filtering over automated rollover | Mutating data for presentation is an anti-pattern; view achieves same UX without destroying scheduling history | [[Task Lifecycle]] |
| Dates only set when empty (no overwrite) | Prevents automation from destroying a legitimate earlier date set by a prior transition | [[Task Lifecycle]] |

## Automation Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Asia/Shanghai timezone for all scripts | Consistency with user's local date regardless of worker timezone | [[Tasks Webhook Router]] |
| Minimum 1-day cron interval for repetitive tasks | Prevents accidental high-frequency task spam from misconfigured expressions | [[Create Repetitive Tasks]] |
| Duplicate check before repetitive task creation | Same-name + same-date guard prevents double-creation on retries or re-runs | [[Create Repetitive Tasks]] |
| Bounce-back prevention via property ID filtering | Lifecycle date write-backs trigger new webhooks, but their property IDs don't match trigger conditions | [[Tasks Webhook Router]] |

## Frontend Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Client-side metrics computation | Simpler API (just serve raw data), instant re-compute on time range change without server round-trip | [[Metrics Functions]] |
| Tailwind 4 with custom dark theme | Linear-inspired aesthetic; consistent with modern developer tools | [[Design System]] |
| React Query for server state | Handles caching, refetching, and loading states with minimal boilerplate | [[State Management]] |
