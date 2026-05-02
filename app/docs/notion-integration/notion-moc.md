---
parent: "[[index]]"
tags:
  - moc
  - notion
  - integration
related:
  - "[[sync-moc]]"
  - "[[backend-moc]]"
---

# Notion Integration

This project syncs data from three Notion databases into a local SQLite store. The integration handles property extraction, pagination, rate limiting, and real-time updates via webhooks.

## Contents

- [[data-sources]] — The three Notion databases (tasks, projects, areas) and their relationships
- [[property-mapping]] — How Notion properties map to SQLite columns
- [[notion-client]] — API wrapper with retry logic and pagination
- [[webhook-handler]] — Real-time updates with HMAC verification
