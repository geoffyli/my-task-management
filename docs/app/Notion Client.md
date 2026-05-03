---
parent: "[[App]]"
tags:
related:
  - "[[Full Sync]]"
  - "[[Reconciliation Loop]]"
  - "[[Webhook Handler]]"
  - "[[Data Sources]]"
---

# Notion API Client

Wrapper around the Notion REST API with pagination, rate limiting, retry logic, and relation truncation detection.

**Source:** `app/server/sync/notion-client.ts`

## Configuration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `NOTION_VERSION` | `"2025-09-03"` | Notion API version header |
| `INTER_PAGE_DELAY_MS` | 350ms | Delay between paginated requests to avoid rate limits |
| `MAX_RETRIES` | 3 | Maximum retry attempts for failed requests |
| `MAX_RESULTS` | 10,000 | Safety cap on total results per query |

## API Key Resolution

```typescript
getNotionKey(): string
```

Priority order:
1. `NOTION_API_KEY` environment variable
2. File at `~/.config/notion/api_key` (read once and cached in memory)
3. Throws error if neither found

## Core Functions

### `queryDatabase(apiKey, dataSourceId, body?)`

Full paginated fetch of a Notion database.

- Endpoint: `POST /v1/data_sources/{dataSourceId}/query`
- Page size: 100 results per request
- Pagination: follows `next_cursor` until `has_more` is false
- Rate limiting: 350ms delay between pages
- Safety cap: stops at 10,000 total results with warning
- Returns: `NotionPage[]`
- Logs: result count, page count, elapsed time

### `queryDatabaseIncremental(apiKey, dataSourceId, sinceTime)`

Incremental query — fetches only pages modified after `sinceTime`.

- Filter: `{ timestamp: "last_edited_time", last_edited_time: { after: sinceTime } }`
- Sort: ascending by `last_edited_time`
- Used by: [[Reconciliation Loop]]

### `fetchPage(apiKey, pageId)`

Fetches a single page by ID.

- Endpoint: `GET /v1/pages/{pageId}`
- Used by: [[Webhook Handler]] to get full page data after receiving an event

## Retry Logic (`fetchWithRetry`)

| Scenario | Behavior |
|----------|----------|
| **429 Rate Limited** | Wait `Retry-After` header value (or 1s), retry up to MAX_RETRIES |
| **5xx Server Error** | Exponential backoff: 1s, 2s, 4s |
| **Other errors** | Throw immediately |

## Relation Truncation Detection

`checkRelationTruncation()` inspects every relation property in query results. When `has_more: true` is found, it logs a warning:

```
[notion] Relation "Project" truncated on page abc123 (>25 items). Data may be incomplete.
```

This indicates the Notion API returned a partial relation list (limit ~100 items).

## Types

```typescript
type NotionPage = {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
};
```

## DATA_SOURCES Map

```typescript
const DATA_SOURCES: Record<string, string> = {
  tasks: "46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe",
  projects: "81899362-e971-4a82-ba25-18fdda1d8f63",
  areas: "0b036eaf-a357-46ec-b479-b6bb88497b74",
};
```

See [[Data Sources]] for details on each database.
