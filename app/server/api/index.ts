import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import type { Database } from "bun:sqlite";
import { getAllTasks, getAllProjects, getAllAreas, getSyncStatus, getSyncEvents, getSyncMeta, logSyncEvent } from "../db";
import {
  insertSubscription, removeSubscription, removeSubscriptionById, getAllSubscriptions,
  getSubscriptionByEndpoint, updateDeviceName, getGlobalPreferences, getAllPreferences,
  upsertGlobalPreferences, upsertDevicePreferences, deleteDevicePreferences, parseDeviceName,
} from "../db/push";
import { fullSync } from "../sync";
import { sendToDevice } from "../notifications/push-service";
import { restartScheduler } from "../notifications/scheduler";

export function createApiRoutes(db: Database): Hono {
  const api = new Hono();

  const token = process.env.TOKEN;
  const isDev = process.env.NODE_ENV === "development" || process.env.DEV === "true";

  api.post("/api/auth/login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!token) {
      if (isDev) return c.json({ ok: true });
      return c.json({ error: "No token configured" }, 500);
    }
    if (body.token === token) {
      return c.json({ ok: true });
    }
    return c.json({ error: "Invalid token" }, 401);
  });

  api.use("/api/*", async (c, next) => {
    if (c.req.path === "/api/auth/login") return next();
    if (c.req.path === "/api/webhooks/notion") return next();
    if (!token && isDev) return next();
    const bearer = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!bearer || !token) return c.json({ error: "Unauthorized" }, 401);
    const a = Buffer.from(bearer);
    const b = Buffer.from(token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return next();
  });

  api.get("/api/tasks", (c) => c.json(getAllTasks(db)));
  api.get("/api/projects", (c) => c.json(getAllProjects(db)));
  api.get("/api/areas", (c) => c.json(getAllAreas(db)));
  api.get("/api/status", (c) => c.json(getSyncStatus(db)));

  api.get("/api/events", (c) => {
    const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
    const offset = Number(c.req.query("offset")) || 0;
    return c.json(getSyncEvents(db, limit, offset));
  });

  api.post("/api/sync", async (c) => {
    try {
      await fullSync(db);
      return c.json({ success: true, message: "Full sync completed" });
    } catch (err) {
      console.error("[sync] Manual sync failed:", err);
      logSyncEvent(db, { event_type: "error", source: "manual_sync", payload: { error: String(err) } });
      return c.json({ success: false, message: String(err) }, 500);
    }
  });

  api.get("/api/webhook-status", (c) => {
    const verificationToken = getSyncMeta(db, "webhook_verification_token");
    return c.json({
      webhookUrl: process.env.NOTION_WEBHOOK_URL || null,
      verified: verificationToken !== null,
    });
  });

  // Push notification endpoints

  api.get("/api/push/vapid-key", (c) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) return c.json({ error: "VAPID not configured" }, 500);
    return c.json({ publicKey });
  });

  api.post("/api/push/subscribe", async (c) => {
    const body = await c.req.json();
    const { endpoint, keys, userAgent } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return c.json({ error: "Invalid subscription" }, 400);
    }
    const deviceName = parseDeviceName(userAgent || c.req.header("User-Agent") || "");
    const deviceId = insertSubscription(db, {
      endpoint,
      keys_p256dh: keys.p256dh,
      keys_auth: keys.auth,
      user_agent: userAgent || c.req.header("User-Agent") || null,
      device_name: deviceName,
    });
    return c.json({ ok: true, deviceId });
  });

  api.delete("/api/push/subscribe", async (c) => {
    const body = await c.req.json();
    if (!body.endpoint) return c.json({ error: "Missing endpoint" }, 400);
    removeSubscription(db, body.endpoint);
    return c.json({ ok: true });
  });

  api.get("/api/push/devices", (c) => {
    const devices = getAllSubscriptions(db).map(({ keys_p256dh, keys_auth, ...rest }) => rest);
    return c.json(devices);
  });

  api.patch("/api/push/devices/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    if (!body.name) return c.json({ error: "Missing name" }, 400);
    updateDeviceName(db, id, body.name);
    return c.json({ ok: true });
  });

  api.delete("/api/push/devices/:id", (c) => {
    const id = Number(c.req.param("id"));
    removeSubscriptionById(db, id);
    return c.json({ ok: true });
  });

  api.get("/api/push/preferences", (c) => {
    const all = getAllPreferences(db);
    const global = all.find((p) => p.device_id === null) ?? null;
    const deviceOverrides = all.filter((p) => p.device_id !== null);
    return c.json({ global, deviceOverrides });
  });

  api.put("/api/push/preferences", async (c) => {
    const body = await c.req.json();
    upsertGlobalPreferences(db, body);
    restartScheduler(db);
    return c.json({ ok: true });
  });

  api.put("/api/push/preferences/:deviceId", async (c) => {
    const deviceId = Number(c.req.param("deviceId"));
    const body = await c.req.json();
    upsertDevicePreferences(db, deviceId, body);
    return c.json({ ok: true });
  });

  api.delete("/api/push/preferences/:deviceId", (c) => {
    const deviceId = Number(c.req.param("deviceId"));
    deleteDevicePreferences(db, deviceId);
    return c.json({ ok: true });
  });

  api.post("/api/push/test", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const endpoint = body.endpoint;
    if (!endpoint) return c.json({ error: "Missing endpoint" }, 400);
    const sub = getSubscriptionByEndpoint(db, endpoint);
    if (!sub) return c.json({ error: "Subscription not found" }, 404);
    const payload = JSON.stringify({
      title: "Test Notification",
      body: "Push notifications are working!",
      tag: "test",
      data: { url: "/" },
    });
    const result = await sendToDevice(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
      payload
    );
    if (result.success) return c.json({ ok: true });
    return c.json({ error: "Failed to send" }, 500);
  });

  return api;
}
