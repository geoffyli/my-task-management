---
parent: "[[Index]]"
tags:
related:
---

# App

Full-stack task analytics dashboard that syncs data from Notion and provides rich visualizations for personal task management. Built with Bun, Hono, SQLite, React, TanStack Query, and Recharts.

## Contents

### Backend

- [[API Routes]] — HTTP endpoints served by the Hono backend
- [[Database Schema]] — SQLite schema with WAL mode
- [[Database Operations]] — CRUD operations and property extraction
- [[Auth System]] — Bearer token authentication

### Frontend

- [[Component Architecture]] — React component organization and patterns
- [[Pages]] — Route table and page-level data flow
- [[State Management]] — React Query, Context, URL state
- [[Charting]] — Recharts visualizations and chart integration
- [[API Client]] — Fetch wrapper and typed React Query hooks

### Sync System

- [[Sync Overview]] — Three-layer sync architecture
- [[Full Sync]] — Complete database fetch and reconciliation
- [[Reconciliation Loop]] — Periodic incremental sync
- [[Webhook Handler]] — Real-time Notion webhook processing
- [[Notion Client]] — Notion REST API wrapper with retry logic

### Notion Integration

- [[Data Sources]] — Notion database hierarchy and UUIDs
- [[Property Mapping]] — Notion property to SQLite column mapping

### Data Model

- [[Types Reference]] — Shared TypeScript interfaces
- [[Metrics Functions]] — Analytics computation functions

### Design

- [[Design System]] — Colors, typography, components, layout, and chart theming
