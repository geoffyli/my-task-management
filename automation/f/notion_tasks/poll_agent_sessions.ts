import { Client } from "@notionhq/client";
import * as wmill from "windmill-client";

const PROP_AGENT = "Agent";
const PROP_AGENT_SESSION = "Agent Session";
const STATUS_REVIEW = "Review";
const STATUS_FAILED = "Failed";
const TASKS_DATA_SOURCE_ID = "46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe";

export async function main() {
  const notion = await wmill.getResource("f/notion/api") as { token: string };
  const opencode = await wmill.getResource("f/notion_tasks/opencode_api") as {
    base_url: string; username: string; password: string;
  };
  const client = new Client({ auth: notion.token });
  const auth = "Basic " + btoa(`${opencode.username}:${opencode.password}`);

  const res = await (client as any).dataSources.query({
    data_source_id: TASKS_DATA_SOURCE_ID,
    filter: { property: PROP_AGENT, select: { equals: "Running" } },
    page_size: 100,
  });
  const tasks: any[] = res.results ?? [];
  console.log(`[poller] ${tasks.length} Running tasks`);
  if (tasks.length === 0) return { checked: 0, set_review: 0, set_failed: 0, skipped: 0 };

  // Abort entire run on failure to avoid false Review transitions
  const statusRes = await fetch(`${opencode.base_url}/session/status`, {
    headers: { "Authorization": auth },
  });
  if (!statusRes.ok) {
    console.error(`[poller] /session/status returned ${statusRes.status} — aborting to avoid false transitions`);
    return { checked: 0, set_review: 0, set_failed: 0, skipped: 0, aborted: true };
  }
  const activeStatusMap: Record<string, { type: string }> = await statusRes.json();
  console.log(`[poller] Sessions in status map: ${Object.keys(activeStatusMap).length}`);

  type Outcome = "review" | "failed" | "skipped";

  const outcomes = await Promise.all(tasks.map(async (task): Promise<Outcome> => {
    const sessionUrl: string | null = task.properties[PROP_AGENT_SESSION]?.url ?? null;
    if (!sessionUrl) {
      console.warn(`[poller] Task ${task.id} has no session URL — skipping`);
      return "skipped";
    }

    let sessionId: string | null = null;
    try {
      const u = new URL(sessionUrl);
      // New format: /Lw/session/{id} — ID is last path segment
      // Legacy format: /s/{slug}?sid={id} — fall back to ?sid param
      const segments = u.pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      sessionId = (lastSegment && lastSegment.startsWith("ses_")) ? lastSegment : u.searchParams.get("sid");
    } catch {}
    if (!sessionId) {
      console.warn(`[poller] Cannot parse session ID from: ${sessionUrl}`);
      return "skipped";
    }

    const statusEntry = activeStatusMap[sessionId];

    if (statusEntry?.type === "busy" || statusEntry?.type === "retry") {
      console.log(`[poller] Task ${task.id} session ${sessionId} is ${statusEntry.type}`);
      return "skipped";
    }

    if (statusEntry?.type === "idle") {
      await client.pages.update({
        page_id: task.id,
        properties: { [PROP_AGENT]: { select: { name: STATUS_REVIEW } } },
      });
      console.log(`[poller] Task ${task.id} → Review (idle)`);
      return "review";
    }

    // Absent from status map — verify session exists before concluding it finished
    const sessionCheck = await fetch(`${opencode.base_url}/session/${sessionId}`, {
      headers: { "Authorization": auth },
    });

    if (sessionCheck.status === 404) {
      await client.pages.update({
        page_id: task.id,
        properties: { [PROP_AGENT]: { select: { name: STATUS_FAILED } } },
      });
      await appendErrorNote(client, task.id, `OpenCode session not found (${sessionId})`);
      console.log(`[poller] Task ${task.id} → Failed (session missing)`);
      return "failed";
    } else if (sessionCheck.ok) {
      await client.pages.update({
        page_id: task.id,
        properties: { [PROP_AGENT]: { select: { name: STATUS_REVIEW } } },
      });
      console.log(`[poller] Task ${task.id} → Review (session evicted from status map)`);
      return "review";
    } else {
      console.warn(`[poller] Unexpected status ${sessionCheck.status} for session ${sessionId}`);
      return "skipped";
    }
  }));

  return {
    checked: outcomes.length,
    set_review: outcomes.filter(o => o === "review").length,
    set_failed: outcomes.filter(o => o === "failed").length,
    skipped: outcomes.filter(o => o === "skipped").length,
  };
}

async function appendErrorNote(client: Client, page_id: string, message: string) {
  try {
    await (client.blocks.children as any).append({
      block_id: page_id,
      children: [
        {
          object: "block", type: "heading_2",
          heading_2: { rich_text: [{ type: "text", text: { content: "Agent Output" } }] },
        },
        {
          object: "block", type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: `Error: ${message}` } }] },
        },
      ],
    });
  } catch (e) {
    console.error("[poller] Failed to append error note:", e);
  }
}
