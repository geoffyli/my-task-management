import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import type { Database } from "bun:sqlite";
import { getAllTasks, getAllProjects, getAllAreas, getSyncStatus, getSyncEvents, getSyncMeta, logSyncEvent } from "../db";
import { fullSync } from "../sync";

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

  return api;
}
