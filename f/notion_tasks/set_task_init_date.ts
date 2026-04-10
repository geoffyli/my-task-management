import { Client } from "@notionhq/client";
import * as wmill from "windmill-client";

// Data source ID for the Tasks database (a43c2d3d-11e5-4a66-be42-dd411a1d9727).
// Notion webhooks (API v2025-09-03+) send the data source ID in parent.id, not the database ID.
const TASKS_DATA_SOURCE_ID = "8ff49260-77c2-4fc7-8727-c822af980aa1";
const TASKS_DATA_SOURCE_ID_NORMALIZED = TASKS_DATA_SOURCE_ID.replace(/-/g, "").toLowerCase();

type Event = {
  kind: "webhook" | "http" | "websocket" | "kafka" | "email" | "nats" | "postgres" | "sqs" | "mqtt" | "gcp";
  body: any;
  headers: Record<string, string>;
  query: Record<string, string>;
};

function normalizeDatabaseId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

export async function preprocessor(event: Event) {
  const body = event.body;

  // Handle one-time Notion webhook verification handshake
  if (body?.verification_token) {
    return { page_id: "__verification__", verification_token: body.verification_token };
  }

  // Validate event type
  if (body?.type !== "page.properties_updated") {
    throw new Error(`Ignoring event type: ${body?.type ?? "unknown"}`);
  }

  // Validate this is for our Tasks database
  const parentId = body?.data?.parent?.id;
  if (!parentId || normalizeDatabaseId(parentId) !== TASKS_DATA_SOURCE_ID_NORMALIZED) {
    throw new Error(`Ignoring event for data source: ${parentId ?? "unknown"}`);
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
    console.log(`Verification token: ${verification_token}`);
    return { verification_token };
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

  // Step 3: Business logic
  if (initialAssignedDate) {
    if (!assignedDate) {
      // Assigned Date was cleared → clear Initial Assigned Date too
      console.log("Clearing Initial Assigned Date (Assigned Date was cleared)");
      await client.pages.update({
        page_id,
        properties: {
          "Initial Assigned Date": { date: null },
        },
      });
      return {
        action: "initial_date_cleared",
        page_id,
        assigned_date: null,
        initial_assigned_date_was: initialAssignedDate,
      };
    }

    // Both dates exist — no action needed
    console.log("Both dates set, no action needed");
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
