import { Client } from "@notionhq/client";
import * as wmill from "windmill-client";

const TASKS_DATABASE_ID = "a43c2d3d-11e5-4a66-be42-dd411a1d9727";
const TASKS_DATABASE_ID_NORMALIZED = TASKS_DATABASE_ID.replace(/-/g, "").toLowerCase();

const ASSIGNED_DATE_PROP_ID = "lMKd";
const STATUS_PROP_ID = "pzUA";

type Event = {
  kind: "webhook" | "http" | "websocket" | "kafka" | "email" | "nats" | "postgres" | "sqs" | "mqtt" | "gcp";
  body: any;
  headers: Record<string, string>;
  query: Record<string, string>;
};

function normalizeUuid(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

export async function preprocessor(event: Event) {
  const body = event.body;

  if (body?.verification_token) {
    return { page_id: "__verification__", triggers: [], verification_token: body.verification_token };
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

  if (updatedProps.includes(ASSIGNED_DATE_PROP_ID)) triggers.push("init_date");
  if (updatedProps.includes(STATUS_PROP_ID)) triggers.push("lifecycle");

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

// --- Init Date Handler ---

async function handleInitDate(client: Client, page_id: string, properties: Record<string, any>) {
  const assignedDate = extractDateProperty(properties, "Assigned Date");
  const initialAssignedDate = extractDateProperty(properties, "Initial Assigned Date");

  console.log(`[init_date] Assigned Date: ${assignedDate ?? "(empty)"}, Initial: ${initialAssignedDate ?? "(empty)"}`);

  if (initialAssignedDate) {
    return { handler: "init_date", action: "no_action_needed" };
  }

  if (!assignedDate) {
    return { handler: "init_date", action: "no_action_needed" };
  }

  console.log(`[init_date] Setting Initial Assigned Date to ${assignedDate}`);
  await client.pages.update({
    page_id,
    properties: { "Initial Assigned Date": { date: { start: assignedDate } } },
  });
  return { handler: "init_date", action: "initial_date_set", value: assignedDate };
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

  if (triggers.includes("init_date")) {
    handlers.push(handleInitDate(client, page_id, page.properties));
  }

  if (triggers.includes("lifecycle")) {
    handlers.push(handleLifecycle(client, page_id, page.properties));
  }

  const results = await Promise.all(handlers);

  return { page_id, results };
}
