import type { Context } from "hono";
import type { Database } from "bun:sqlite";
import { timingSafeEqual } from "crypto";
import { upsertPage, softDeletePage, restorePage, setSyncMeta, getSyncMeta, logSyncEvent } from "../db";
import type { RawPage } from "../db";
import { fetchPage, getNotionKey, DATA_SOURCES } from "./notion-client";

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = new Bun.CryptoHasher("sha256", secret);
  hmac.update(body);
  const expected = hmac.digest("hex");
  const actual = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function determineDatabaseId(pageId: string, db: Database): string | null {
  const row = db.query("SELECT database_id FROM pages WHERE id = ?").get(pageId) as { database_id: string } | null;
  return row?.database_id ?? null;
}

export function createWebhookHandler(db: Database) {
  return async (c: Context) => {
    const rawBody = await c.req.text();

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Handle verification request from Notion (no HMAC on this one)
    if (payload.verification_token && !payload.type) {
      setSyncMeta(db, "webhook_verification_token", payload.verification_token);
      logSyncEvent(db, {
        event_type: "webhook_verification",
        source: "notion",
        payload: { message: "Verification token received. Copy from Admin UI and paste into Notion." },
      });
      console.log("[webhook] Verification token received and stored. Complete verification in Notion UI.");
      return c.json({ ok: true });
    }

    // For all other requests, validate HMAC signature
    const storedToken = getSyncMeta(db, "webhook_verification_token");
    if (!storedToken) {
      return c.json({ error: "Webhook not verified yet — awaiting verification from Notion" }, 503);
    }

    const signature = c.req.header("X-Notion-Signature");
    if (!signature || !verifySignature(rawBody, signature, storedToken)) {
      return c.json({ error: "Invalid signature" }, 401);
    }

    const apiKey = getNotionKey();

    try {
      await processWebhookEvent(db, apiKey, payload);
      setSyncMeta(db, "last_webhook", new Date().toISOString());
      logSyncEvent(db, {
        event_type: "webhook",
        source: "notion_webhook",
        payload: { type: payload.type, entityId: payload.entity?.id },
      });
    } catch (err) {
      console.error("[webhook] Error processing event:", err);
      logSyncEvent(db, {
        event_type: "error",
        source: "webhook",
        payload: { error: String(err), event_type: payload.type },
      });
    }

    return c.json({ ok: true });
  };
}

async function processWebhookEvent(db: Database, apiKey: string, event: any): Promise<void> {
  const eventType: string = event.type;
  const pageId: string | undefined = event.entity?.id;

  if (!pageId) {
    console.warn("[webhook] Event has no identifiable page ID:", eventType);
    return;
  }

  if (eventType === "page.deleted") {
    softDeletePage(db, pageId);
    return;
  }

  if (eventType === "page.undeleted") {
    restorePage(db, pageId);
  }

  // Try to identify database from event payload (avoids extra API call for known pages)
  let databaseId = determineDatabaseId(pageId, db);

  if (!databaseId && event.data?.parent?.type === "data_source") {
    const dsId = event.data.parent.id?.replace(/-/g, "");
    databaseId = dsId ? (REVERSE_DATA_SOURCES[dsId] ?? null) : null;
  }

  // Fetch full page for upsert (and fallback database identification)
  const page = await fetchPage(apiKey, pageId);

  if (!databaseId) {
    databaseId = identifyDatabaseFromParent(page);
  }

  if (!databaseId) {
    console.warn(`[webhook] Could not determine database for page ${pageId}`);
    return;
  }

  const rawPage: RawPage = {
    id: page.id,
    database_id: databaseId,
    raw_json: JSON.stringify(page),
    last_edited_time: page.last_edited_time,
  };

  upsertPage(db, rawPage);
}

const REVERSE_DATA_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(DATA_SOURCES).map(([name, id]) => [id.replace(/-/g, ""), name])
);

function identifyDatabaseFromParent(page: any): string | null {
  const parentId: string | undefined =
    page.parent?.data_source_id || page.parent?.database_id;
  if (!parentId) return null;
  const normalized = parentId.replace(/-/g, "");
  return REVERSE_DATA_SOURCES[normalized] ?? null;
}
