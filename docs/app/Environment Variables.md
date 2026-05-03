---
parent: "[[App]]"
tags:
related:
  - "[[Auth System]]"
  - "[[Getting Started]]"
  - "[[Railway Deployment]]"
---

# Environment Variables

All configuration is managed through environment variables. Copy `.env.example` to `.env` for local development.

**Source:** `app/.env.example`

## Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NOTION_API_KEY` | Yes (or file) | — | Notion integration API key. Get from https://www.notion.so/my-integrations |
| `TOKEN` | Production only | — | Bearer token for API authentication. Generate with `openssl rand -hex 32` |
| `PORT` | No | `3456` | HTTP server listen port |
| `DB_PATH` | No | `./data/analytics.db` | SQLite database file path |
| `NOTION_WEBHOOK_URL` | No | — | Public webhook URL (display-only in Settings UI) |
| `NODE_ENV` | No | — | Set to `development` to enable dev mode |
| `DEV` | No | — | Set to `true` as alternative dev mode flag |

## Notion API Key Resolution

The server resolves the Notion API key in priority order:

1. `NOTION_API_KEY` environment variable
2. File at `~/.config/notion/api_key` (contents read and cached)
3. Error thrown if neither found

**Source:** `app/server/sync/notion-client.ts`

## Development vs Production

### Development

```bash
NOTION_API_KEY=ntn_xxxxx
DEV=true
# TOKEN not required — auth is bypassed in dev mode
```

When `NODE_ENV=development` or `DEV=true`:
- Bearer token authentication is skipped on all API routes
- Login endpoint accepts any token value

### Production

```bash
NOTION_API_KEY=ntn_xxxxx
TOKEN=<64-char-hex-string>
PORT=3456
DB_PATH=/app/data/analytics.db
NOTION_WEBHOOK_URL=https://your-app.example.com/api/webhooks/notion
```

All API routes require a valid `Authorization: Bearer <TOKEN>` header.

## Webhook URL

The `NOTION_WEBHOOK_URL` variable is purely informational — it is displayed in the Settings page UI for reference when configuring the Notion webhook. The actual webhook endpoint is always `POST /api/webhooks/notion` regardless of this variable's value.
