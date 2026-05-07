import { Client } from "@notionhq/client";
import * as wmill from "windmill-client";

// Notion Tasks database — stable container ID (parent.id in webhook payloads).
// Unlike data_source_id (which has changed multiple times), database_id is stable.
const TASKS_DATABASE_ID = "a43c2d3d-11e5-4a66-be42-dd411a1d9727";
const TASKS_DATABASE_ID_NORMALIZED = TASKS_DATABASE_ID.replace(/-/g, "").toLowerCase();

// Notion property ID for "Assigned Date" (retrieved from database schema via API).
// Webhook updated_properties arrays contain property IDs, not human-readable names.
const ASSIGNED_DATE_PROP_ID = "lMKd";

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

  // Handle one-time Notion webhook verification handshake
  if (body?.verification_token) {
    return { page_id: "__verification__", verification_token: body.verification_token };
  }

  // Validate event type — skip silently so Windmill doesn't log a failure
  if (body?.type !== "page.properties_updated") {
    console.log(`Skipping non-target event type: ${body?.type ?? "unknown"}`);
    return { page_id: "__skip__" };
  }

  // Validate this is for our Tasks database (using the stable database container ID)
  const parent = body?.data?.parent;
  if (parent?.type !== "database" || !parent?.id || normalizeUuid(parent.id) !== TASKS_DATABASE_ID_NORMALIZED) {
    console.log(`Skipping event for non-target database: type=${parent?.type}, id=${parent?.id ?? "unknown"}`);
    return { page_id: "__skip__" };
  }

  // Only process webhooks where "Assigned Date" (lMKd) actually changed.
  // This also prevents bounce-back from our own writes to "Initial Assigned Date" (nJET).
  const updatedProps: unknown[] = body?.data?.updated_properties ?? [];
  if (!updatedProps.includes(ASSIGNED_DATE_PROP_ID)) {
    console.log(`Skipping: updated properties ${JSON.stringify(updatedProps)} do not include Assigned Date (${ASSIGNED_DATE_PROP_ID})`);
    return { page_id: "__skip__" };
  }

  // Extract page ID
  const pageId = body?.entity?.id;
  if (!pageId) {
    throw new Error("Missing entity.id (page ID) in webhook payload");
  }

  console.log(`Preprocessor: page ${pageId}, type: ${body.type}`);

  return {
    page_id: pageId,
  };
}

function extractDateProperty(properties: Record<string, any>, name: string): string | null {
  const prop = properties[name];
  if (prop?.type === "date" && prop.date?.start) {
    return prop.date.start;
  }
  return null;
}

export async function main(page_id: string, verification_token?: string) {
  // Handle one-time Notion webhook verification handshake
  if (page_id === "__verification__" && verification_token) {
    console.log("Verification handshake completed");
    return { verification_token };
  }

  // Skip irrelevant event types (filtered in preprocessor)
  if (page_id === "__skip__") {
    return { action: "skipped", reason: "irrelevant_event_type" };
  }

  // Fetch Notion credentials from Windmill resource
  const notion = await wmill.getResource("f/notion/api") as { token: string };
  const client = new Client({ auth: notion.token });

  // Step 1: Retrieve the full page
  console.log(`Retrieving page ${page_id}...`);
  const page = await client.pages.retrieve({ page_id });

  if (!("properties" in page)) {
    return { action: "skipped", reason: "partial_page", page_id };
  }

  // Step 2: Extract property values
  const assignedDate = extractDateProperty(page.properties, "Assigned Date");
  const initialAssignedDate = extractDateProperty(page.properties, "Initial Assigned Date");

  console.log(`Assigned Date: ${assignedDate ?? "(empty)"}`);
  console.log(`Initial Assigned Date: ${initialAssignedDate ?? "(empty)"}`);

  // Step 3: Business logic — Initial Assigned Date is immutable once set
  if (initialAssignedDate) {
    console.log("Initial Assigned Date already set, no action needed");
    return {
      action: "no_action_needed",
      page_id,
      assigned_date: assignedDate,
      initial_assigned_date: initialAssignedDate,
    };
  }

  // Initial Assigned Date is empty → set it to current Assigned Date value
  if (!assignedDate) {
    console.log("Both dates empty, no action needed");
    return {
      action: "no_action_needed",
      page_id,
      assigned_date: null,
      initial_assigned_date: null,
    };
  }

  console.log(`Setting Initial Assigned Date to ${assignedDate}`);
  await client.pages.update({
    page_id,
    properties: {
      "Initial Assigned Date": { date: { start: assignedDate } },
    },
  });

  return {
    action: "initial_date_set",
    page_id,
    assigned_date: assignedDate,
    initial_assigned_date: assignedDate,
  };
}
