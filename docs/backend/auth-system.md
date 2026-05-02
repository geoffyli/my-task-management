---
parent: "[[backend-moc]]"
tags:
  - backend
  - auth
  - security
related:
  - "[[api-routes]]"
  - "[[environment-variables]]"
---

# Authentication System

A simple bearer token scheme designed for a single-user personal tool.

## Overview

The system uses one shared secret token configured via the `TOKEN` environment variable. All API requests must include this token in the `Authorization` header.

## Backend Authentication

**Source:** `server/api/index.ts`

### Middleware Logic

```
1. Request arrives at /api/*
2. Skip auth for: /api/auth/login, /api/webhooks/notion
3. If no TOKEN configured AND dev mode → allow through
4. Extract token from "Authorization: Bearer <token>" header
5. Compare to TOKEN env var → 401 if mismatch
```

### Login Endpoint

`POST /api/auth/login`

- **Request body:** `{ "token": "<string>" }`
- **Success:** `{ "ok": true }` (200)
- **Invalid token:** `{ "error": "Invalid token" }` (401)
- **No token configured (non-dev):** `{ "error": "No token configured" }` (500)
- **Dev mode (no token set):** Always returns `{ "ok": true }`

### Dev Mode Bypass

When `NODE_ENV=development` or `DEV=true`, and no `TOKEN` is set:
- All API routes pass without authorization
- Login accepts any input

### Webhook Authentication

The webhook route (`POST /api/webhooks/notion`) is exempt from bearer token auth. Instead, it uses HMAC-SHA256 signature verification — see [[webhook-handler]].

## Frontend Authentication

**Source:** `src/contexts/AuthContext.tsx`, `src/lib/auth.ts`

### Storage Strategy

| Mode | Storage | Expiry |
|------|---------|--------|
| "Remember me" checked | `localStorage` | 7 days (`AUTH_DURATION_MS`) |
| "Remember me" unchecked | `sessionStorage` | Browser session close |

**Storage keys:**
- `auth_token` — The bearer token value
- `auth_expires` — Unix timestamp of expiry (localStorage only)

### Token Lifecycle

1. User submits token on login page
2. `POST /api/auth/login` validates it
3. Token stored in localStorage (with expiry) or sessionStorage
4. `AuthContext` provides `token` and `isAuthenticated` to all components
5. API client reads token from context for `Authorization` header
6. On app load, `getStoredToken()` checks expiry — auto-clears if expired
7. `logout()` removes token from both storage locations

### AuthContext API

```typescript
interface AuthContextValue {
  token: string;
  isAuthenticated: boolean;
  login: (token: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
}
```

### Constants

```typescript
AUTH_STORAGE_KEY = "auth_token";
AUTH_EXPIRES_KEY = "auth_expires";
AUTH_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
```

## Security Notes

- This is a personal tool, not a multi-user production system
- The token is a simple shared secret (generate with `openssl rand -hex 32`)
- No session management, refresh tokens, or OAuth
- XSS could expose the token from localStorage — acceptable for a personal deployment
- HTTPS should be enforced at the deployment layer (reverse proxy / platform)
