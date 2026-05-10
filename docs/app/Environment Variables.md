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
| `VAPID_PUBLIC_KEY` | For push | — | Web Push VAPID public key (base64url) |
| `VAPID_PRIVATE_KEY` | For push | — | Web Push VAPID private key (base64url) |
| `VAPID_SUBJECT` | For push | — | VAPID contact URI (mailto:) |
| `VITE_VAPID_PUBLIC_KEY` | For push (build-time) | — | Same as VAPID_PUBLIC_KEY, exposed to client via Vite |

## Notion API Key Resolution

The server resolves the Notion API key in priority order:

1. `NOTION_API_KEY` environment variable
2. File at `~/.config/notion/api_key` (contents read and cached)
3. Error thrown if neither found

**Source:** `app/server/sync/notion-client.ts`

## Push Notification Keys

VAPID keys are required for Web Push notifications. Generate a key pair with:

```bash
npx web-push generate-vapid-keys
```

Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` on the server. The client needs access to the public key at build time via `VITE_VAPID_PUBLIC_KEY` (Vite exposes variables prefixed with `VITE_` to the frontend bundle).

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
VAPID_PUBLIC_KEY=<base64url-encoded-public-key>
VAPID_PRIVATE_KEY=<base64url-encoded-private-key>
VAPID_SUBJECT=mailto:admin@example.com
VITE_VAPID_PUBLIC_KEY=<same-as-VAPID_PUBLIC_KEY>
```

All API routes require a valid `Authorization: Bearer <TOKEN>` header.

## Webhook URL

The `NOTION_WEBHOOK_URL` variable is purely informational — it is displayed in the Settings page UI for reference when configuring the Notion webhook. The actual webhook endpoint is always `POST /api/webhooks/notion` regardless of this variable's value.
