import { createHmac, timingSafeEqual } from "node:crypto";
import { Client } from "@notionhq/client";
import * as wmill from "windmill-client";

const TASKS_DATABASE_ID = "a43c2d3d-11e5-4a66-be42-dd411a1d9727";
const TASKS_DATABASE_ID_NORMALIZED = TASKS_DATABASE_ID.replace(/-/g, "").toLowerCase();

const STATUS_PROP_ID = "pzUA";
const AGENT_PROP_ID = "IMWB";

type Event = {
  kind: "webhook" | "http" | "websocket" | "kafka" | "email" | "nats" | "postgres" | "sqs" | "mqtt" | "gcp";
  body: any;
  raw_string?: string;
  headers: Record<string, string>;
  query: Record<string, string>;
};

function normalizeUuid(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

function verifyHmac(rawBody: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody);
    const expected = hmac.digest("hex");
    const actual = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
  } catch {
    return false;
  }
}

export async function preprocessor(event: Event) {
  const body = event.body;

  // One-time verification handshake — no HMAC check needed
  if (body?.verification_token) {
    return { page_id: "__verification__", triggers: [], verification_token: body.verification_token };
  }

  // HMAC verification
  const rawString = event.raw_string;
  if (!rawString) {
    console.error("raw_string missing — HTTP trigger must have raw_string: true");
    return { page_id: "__skip__", triggers: [] };
  }

  const signature = event.headers?.["x-notion-signature"] ?? "";
  if (signature) {
    let secret: string;
    try {
      secret = await wmill.getVariable("f/notion_tasks/notion_webhook_secret") as string;
    } catch (e) {
      console.warn("[preprocessor] Could not load webhook secret — skipping HMAC check:", e);
      secret = "";
    }
    if (secret && !verifyHmac(rawString, signature, secret)) {
      console.warn("[preprocessor] HMAC signature invalid — skipping");
      return { page_id: "__skip__", triggers: [] };
    }
  }

  if (body?.type !== "page.properties_updated") {
    console.log(`Skipping non-target event type: ${body?.type ?? "unknown"}`);
    return { page_id: "__skip__", triggers: [] };
  }

  const parent = body?.data?.parent;
  if (parent?.type !== "database" || !parent?.id || normalizeUuid(parent.id) !== TASKS_DATABASE_ID_NORMALIZED) {
    console.log(`Skipping event for non-target database: ${parent?.id ?? "unknown"}`);
    return { page_id: "__skip__", triggers: [] };
  }

  const updatedProps: unknown[] = body?.data?.updated_properties ?? [];
  const triggers: string[] = [];

  if (updatedProps.includes(STATUS_PROP_ID)) triggers.push("lifecycle");
  if (updatedProps.includes(AGENT_PROP_ID)) triggers.push("agent_dispatch");

  if (triggers.length === 0) {
    console.log(`Skipping: updated properties ${JSON.stringify(updatedProps)} don't match any handler`);
    return { page_id: "__skip__", triggers: [] };
  }

  const pageId = body?.entity?.id;
  if (!pageId) {
    throw new Error("Missing entity.id (page ID) in webhook payload");
  }

  console.log(`Router: page ${pageId}, triggers: ${triggers.join(", ")}`);
  return { page_id: pageId, triggers };
}

function extractDateProperty(properties: Record<string, any>, name: string): string | null {
  const prop = properties[name];
  if (prop?.type === "date" && prop.date?.start) {
    return prop.date.start;
  }
  return null;
}

function extractSelectProperty(properties: Record<string, any>, name: string): string | null {
  const prop = properties[name];
  if (prop?.type === "select" && prop.select?.name) {
    return prop.select.name;
  }
  return null;
}

function getTodayCST(): string {
  const now = new Date();
  const cst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const y = cst.getFullYear();
  const m = String(cst.getMonth() + 1).padStart(2, "0");
  const d = String(cst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- Lifecycle Handler (Started Date + Closed Date) ---

async function handleLifecycle(client: Client, page_id: string, properties: Record<string, any>) {
  const status = extractSelectProperty(properties, "Status");
  const startedDate = extractDateProperty(properties, "Started Date");
  const closedDate = extractDateProperty(properties, "Closed Date");
  const today = getTodayCST();

  console.log(`[lifecycle] Status: ${status}, Started: ${startedDate ?? "(empty)"}, Closed: ${closedDate ?? "(empty)"}`);

  const updates: Record<string, any> = {};

  switch (status) {
    case "In Progress":
      if (!startedDate) updates["Started Date"] = { date: { start: today } };
      if (closedDate) updates["Closed Date"] = { date: null };
      break;

    case "Done":
    case "Cancelled":
      if (!closedDate) updates["Closed Date"] = { date: { start: today } };
      if (!startedDate) updates["Started Date"] = { date: { start: today } };
      break;

    case "Not Started":
      if (startedDate) updates["Started Date"] = { date: null };
      if (closedDate) updates["Closed Date"] = { date: null };
      break;

    case "Blocked":
      break;

    default:
      console.log(`[lifecycle] Unknown status "${status}", no action`);
      return { handler: "lifecycle", action: "no_action", status };
  }

  if (Object.keys(updates).length === 0) {
    console.log("[lifecycle] No date changes needed");
    return { handler: "lifecycle", action: "no_action", status };
  }

  console.log(`[lifecycle] Updating: ${Object.keys(updates).join(", ")}`);
  await client.pages.update({ page_id, properties: updates });

  return {
    handler: "lifecycle",
    action: "dates_updated",
    status,
    updates: Object.keys(updates),
  };
}

// --- Agent Dispatch Handler ---

async function handleAgentDispatch(page_id: string, properties: Record<string, any>) {
  const agentStatus = extractSelectProperty(properties, "Agent");

  if (agentStatus !== "Queued") {
    console.log(`[agent_dispatch] Agent = "${agentStatus}", not Queued — skipping`);
    return { handler: "agent_dispatch", action: "skipped", agent_status: agentStatus };
  }

  console.log(`[agent_dispatch] Agent = Queued — dispatching for page ${page_id}`);
  const jobId = await wmill.runScriptByPathAsync(
    "f/notion_tasks/dispatch_agent_task",
    undefined,
    { page_id },
  );

  console.log(`[agent_dispatch] Dispatch job queued: ${jobId}`);
  return { handler: "agent_dispatch", action: "dispatched", job_id: jobId, page_id };
}

// --- Main ---

export async function main(page_id: string, triggers: string[], verification_token?: string) {
  if (page_id === "__verification__" && verification_token) {
    console.log("Verification handshake completed");
    return { verification_token };
  }

  if (page_id === "__skip__") {
    return { action: "skipped" };
  }

  const notion = await wmill.getResource("f/notion/api") as { token: string };
  const client = new Client({ auth: notion.token });

  console.log(`Retrieving page ${page_id}...`);
  const page = await client.pages.retrieve({ page_id });

  if (!("properties" in page)) {
    return { action: "skipped", reason: "partial_page", page_id };
  }

  const handlers: Promise<any>[] = [];

  if (triggers.includes("lifecycle")) {
    handlers.push(handleLifecycle(client, page_id, page.properties));
  }

  if (triggers.includes("agent_dispatch")) {
    handlers.push(handleAgentDispatch(page_id, page.properties));
  }

  const results = await Promise.all(handlers);

  return { page_id, results };
}
