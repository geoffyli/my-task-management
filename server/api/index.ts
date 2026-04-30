import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import { getAllTasks, getAllProjects, getAllAreas, getSyncStatus, getSyncEvents, getSyncMeta, logSyncEvent } from "../db";
import { fullSync } from "../sync";

export function createApiRoutes(db: Database): Hono {
  const api = new Hono();

  // Data endpoints
  api.get("/api/tasks", (c) => {
    const tasks = getAllTasks(db);
    return c.json(tasks);
  });

  api.get("/api/projects", (c) => {
    const projects = getAllProjects(db);
    return c.json(projects);
  });

  api.get("/api/areas", (c) => {
    const areas = getAllAreas(db);
    return c.json(areas);
  });

  // Admin endpoints (protected by secret token)
  const adminToken = process.env.ADMIN_SECRET_TOKEN;

  function validateAdmin(c: any): boolean {
    if (!adminToken) {
      const isDev = process.env.NODE_ENV === "development" || process.env.DEV === "true";
      return isDev;
    }
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    return token === adminToken;
  }

  api.get("/api/admin/health", (c) => {
    if (!validateAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
    const status = getSyncStatus(db);
    return c.json({ healthy: status.pagesTracked.tasks > 0, ...status });
  });

  api.get("/api/admin/status", (c) => {
    if (!validateAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
    return c.json(getSyncStatus(db));
  });

  api.get("/api/admin/events", (c) => {
    if (!validateAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
    const limit = Number(c.req.query("limit")) || 50;
    const offset = Number(c.req.query("offset")) || 0;
    return c.json(getSyncEvents(db, limit, offset));
  });

  api.post("/api/admin/sync", async (c) => {
    if (!validateAdmin(c)) return c.json({ error: "Unauthorized" }, 401);

    try {
      await fullSync(db);
      return c.json({ success: true, message: "Full sync completed" });
    } catch (err) {
      console.error("[admin] Manual sync failed:", err);
      logSyncEvent(db, { event_type: "error", source: "manual_sync", payload: { error: String(err) } });
      return c.json({ success: false, message: String(err) }, 500);
    }
  });

  api.get("/api/admin/webhook-status", (c) => {
    if (!validateAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
    const token = getSyncMeta(db, "webhook_verification_token");
    return c.json({
      webhookUrl: process.env.NOTION_WEBHOOK_URL || null,
      verified: token !== null,
      verificationToken: token,
    });
  });

  return api;
}
