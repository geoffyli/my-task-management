---
parent: "[[index]]"
tags:
  - moc
  - backend
related:
  - "[[sync-moc]]"
  - "[[data-model-moc]]"
---

# Backend

The backend is a Bun + Hono server that provides a JSON API, serves the compiled frontend, and manages data synchronization with Notion.

**Entry point:** `server/index.ts`

## Contents

- [[api-routes]] — All HTTP endpoints with request/response shapes
- [[push-notifications]] — Web Push system: scheduling, delivery, iOS health check
- [[database-schema]] — SQLite tables, columns, indexes, and relationships
- [[database-operations]] — Store layer: upsert, property extraction, queries
- [[auth-system]] — Bearer token authentication and dev mode bypass
