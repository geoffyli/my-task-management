import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { initDb, closeDb, getPageCount, getSyncMeta } from "./db";
import { fullSync, startReconciliationLoop, createWebhookHandler } from "./sync";
import { createApiRoutes } from "./api";

let ready = false;
let reconcileTimer: Timer | null = null;

const dbPath = process.env.DB_PATH || "./data/analytics.db";
const db = initDb(dbPath);

const app = new Hono();
app.use("*", cors());

app.get("/healthz", (c) => {
  if (!ready) return c.json({ status: "booting" }, 503);
  return c.json({ status: "ok" });
});

const apiRoutes = createApiRoutes(db);
app.route("/", apiRoutes);

app.post("/api/webhooks/notion", createWebhookHandler(db));

app.get("/api/webhooks/notion", (c) => {
  const hasToken = getSyncMeta(db, "webhook_verification_token") !== null;
  const lastWebhook = getSyncMeta(db, "last_webhook");
  return c.json({ reachable: true, verified: hasToken, lastWebhook });
});

const distPath = resolve(import.meta.dir, "../dist");
if (existsSync(distPath)) {
  app.use("*", serveStatic({ root: distPath }));

  const indexHtml = readFileSync(resolve(distPath, "index.html"), "utf-8");
  app.get("*", (c) => {
    return c.html(indexHtml);
  });
}

async function boot() {
  const counts = getPageCount(db);
  const isEmpty = counts.tasks === 0 && counts.projects === 0 && counts.areas === 0;

  if (isEmpty) {
    console.log("[boot] Empty database — running full sync...");
    await fullSync(db);
  } else {
    console.log(`[boot] Database has data (${counts.tasks} tasks, ${counts.projects} projects, ${counts.areas} areas)`);
  }

  reconcileTimer = startReconciliationLoop(db);
  ready = true;

  const port = Number(process.env.PORT) || 3456;
  console.log(`[boot] Task Management Analytics running on http://localhost:${port}`);
}

// Graceful shutdown — clear timer before closing DB to prevent use-after-close
process.on("SIGTERM", () => {
  if (reconcileTimer) clearInterval(reconcileTimer);
  closeDb();
  process.exit(0);
});

process.on("SIGINT", () => {
  if (reconcileTimer) clearInterval(reconcileTimer);
  closeDb();
  process.exit(0);
});

boot().catch((err) => {
  console.error("[boot] Fatal error during startup:", err);
  process.exit(1);
});

const port = Number(process.env.PORT) || 3456;

export default {
  port,
  fetch: app.fetch,
};
