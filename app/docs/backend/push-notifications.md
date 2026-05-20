---
parent: "[[backend-moc]]"
tags:
  - backend
  - notifications
  - push
  - pwa
related:
  - "[[api-routes]]"
  - "[[database-schema]]"
---

# Push Notifications

Web Push notification system delivering task reminders, digests, and alerts via the VAPID protocol. Supports multi-device subscriptions with per-device preference overrides.

## Architecture

```
┌─ Client (React + Vite PWA) ─────────────────────────────┐
│                                                           │
│  Service Worker (sw.ts)                                  │
│  ├─ install → skipWaiting()                              │
│  ├─ activate → clients.claim()                           │
│  ├─ push → showNotification()                            │
│  ├─ notificationclick → deep-link                        │
│  └─ pushsubscriptionchange → auto-resubscribe            │
│                                                           │
│  usePushNotifications Hook                               │
│  ├─ Subscription lifecycle (subscribe/unsubscribe)       │
│  ├─ iOS health check (visibilitychange, 5min throttle)   │
│  └─ Auto-resubscribe on silent invalidation              │
│                                                           │
└──────────────────────────────────────────────────────────┘
                          ↕ HTTP
┌─ Server (Hono + Bun) ───────────────────────────────────┐
│                                                           │
│  Scheduler (croner)                                      │
│  ├─ Tasks due today @ configurable time                  │
│  ├─ Tasks due tomorrow @ configurable time               │
│  ├─ Overdue tasks @ configurable time                    │
│  ├─ Daily digest @ configurable time                     │
│  ├─ Weekly review @ configurable day+time                │
│  ├─ Blocked alert @ configurable time (threshold days)   │
│  └─ Stale alert @ configurable time (threshold days)     │
│                                                           │
│  Push Service (web-push)                                 │
│  ├─ VAPID authentication                                 │
│  ├─ Parallel delivery (Promise.allSettled)                │
│  ├─ TTL: 3600s, urgency header support                   │
│  └─ Auto-remove 410/404 stale subscriptions              │
│                                                           │
│  Event Triggers                                          │
│  ├─ Sync failure alert                                   │
│  └─ Sync recovery confirmation                           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Service Worker

`src/sw.ts` — Workbox-based service worker with manual push handling.

**Lifecycle handlers:**
- `install` → `skipWaiting()` for immediate activation
- `activate` → `clients.claim()` to take control of all open pages

**Push handler:**
- Parses payload JSON with try/catch (iOS 18 background bug protection)
- Shows notification with title, body, icon, badge, tag, and deep-link URL
- Tag-based grouping replaces duplicate notifications

**Click handler:**
- Uses `includeUncontrolled: true` to find all windows
- Navigates existing window to target URL before focusing
- Falls back to `openWindow` if no matching window exists

**`pushsubscriptionchange` handler:**
- Auto-resubscribes when the browser invalidates the endpoint
- POSTs new keys to `/api/push/refresh` with domain validation
- Best-effort — client-side health check handles failures on next app open

## iOS Subscription Health Check

iOS/WebKit has documented bugs (#284111, #273063) where push subscriptions are silently invalidated. Apple's push service may return HTTP 201 for dead endpoints, so the server never learns the subscription is gone.

**Recovery mechanism** (`usePushNotifications` hook):
1. On mount and on `visibilitychange` (throttled to 5-minute intervals):
   - Gets current subscription via `pushManager.getSubscription()`
2. If subscription is null AND permission is "granted":
   - Auto-resubscribes using VAPID public key
   - Removes old endpoint from server
   - Sends new subscription to `/api/push/subscribe`
3. If endpoint rotated (differs from localStorage):
   - Updates server with new endpoint
4. localStorage stores last-known endpoint for detecting silent rotations

## Notification Types

| Type | Schedule | Description |
|------|----------|-------------|
| `tasks_due_today` | Daily (default 08:00) | Tasks with deadline = today |
| `tasks_due_tomorrow` | Daily (default 08:00) | Tasks with deadline = tomorrow |
| `overdue_tasks` | Daily (default 08:00) | Tasks past deadline |
| `daily_digest` | Daily (default 07:30) | Summary: total, in-progress, blocked |
| `weekly_review` | Weekly (default Sun 18:00) | 7-day summary: upcoming, overdue, completed |
| `blocked_alert` | Daily (default 09:00) | Tasks blocked ≥ N days (default 3) |
| `stale_alert` | Daily (default 09:00) | Tasks untouched ≥ N days (default 7) |
| `sync_failure` | Event-triggered | Notion sync error |
| `sync_recovery` | Event-triggered | Sync restored after failure |
| `db_health` | Event-triggered | Database health alert |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/push/vapid-key` | Bearer | Get VAPID public key |
| POST | `/api/push/subscribe` | Bearer | Register device subscription |
| DELETE | `/api/push/subscribe` | Bearer | Unsubscribe device |
| POST | `/api/push/refresh` | None | SW-initiated subscription refresh (domain-validated) |
| GET | `/api/push/devices` | Bearer | List all subscribed devices |
| PATCH | `/api/push/devices/:id` | Bearer | Update device name |
| DELETE | `/api/push/devices/:id` | Bearer | Delete device |
| POST | `/api/push/test` | Bearer | Send test notification |
| GET | `/api/push/preferences` | Bearer | Get global + device preferences |
| PUT | `/api/push/preferences` | Bearer | Update global preferences (restarts scheduler) |
| PUT | `/api/push/preferences/:deviceId` | Bearer | Update device-specific preferences |
| DELETE | `/api/push/preferences/:deviceId` | Bearer | Delete device preferences |

## Preferences Model

- **Global preferences** (`device_id IS NULL`): apply to all devices as defaults
- **Device preferences** (`device_id = <id>`): override global for specific device
- **Master toggle** (`enabled`): disables all notifications when off
- **Per-type toggles**: each notification type can be individually disabled
- **Schedule configuration**: time (HH:MM) and threshold (days) per notification type

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key — generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key |
| `VAPID_SUBJECT` | Yes | Contact URI, e.g. `mailto:you@example.com` |
| `VITE_VAPID_PUBLIC_KEY` | Yes | Same public key, exposed to frontend via Vite env |

## Testing

```bash
# Send test notification to all devices
curl -X POST "http://localhost:8787/api/push/test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Known Limitations

- **iOS requires Home Screen install** — Web Push on iOS only works for PWAs added to Home Screen (standalone mode). The UI detects this and shows guidance.
- **iOS silent subscription invalidation** — iOS/WebKit can silently revoke push subscriptions (bugs #284111, #273063). Apple's push service may return HTTP 201 for dead endpoints. The client-side health check auto-resubscribes on next app open, but notifications can be missed between invalidation and recovery.
- **Single instance** — The in-process scheduler assumes one running instance.

## Key Files

| File | Purpose |
|------|---------|
| `src/sw.ts` | Service worker with push/click/lifecycle handlers |
| `src/hooks/usePushNotifications.ts` | React hook: subscription lifecycle + iOS health check |
| `src/lib/push.ts` | Browser support detection, iOS handling, VAPID conversion |
| `src/components/settings/NotificationSettings.tsx` | Full preferences UI |
| `server/notifications/push-service.ts` | VAPID init, sendToDevice, sendToAll |
| `server/notifications/scheduler.ts` | Cron jobs for all notification types |
| `server/notifications/templates.ts` | Notification payload generators |
| `server/notifications/event-triggers.ts` | Sync failure/recovery handlers |
| `server/db/push.ts` | DB CRUD for subscriptions + preferences |
| `server/api/index.ts` | All push API endpoints |
