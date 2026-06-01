import { Client } from "@notionhq/client";
import * as wmill from "windmill-client";

const OPENCODE_MODEL = { id: "gpt-5.4", providerID: "openai" };

const PROP_AGENT = "Agent";
const PROP_AGENT_SESSION = "Agent Session";
const PROP_TASK_NAME = "Task Name";
const STATUS_QUEUED = "Queued";
const STATUS_RUNNING = "Running";
const STATUS_FAILED = "Failed";

export async function main(page_id: string) {
  const notion = await wmill.getResource("f/notion/api") as { token: string };
  const opencode = await wmill.getResource("f/notion_tasks/opencode_api") as {
    base_url: string; username: string; password: string;
  };
  const client = new Client({ auth: notion.token });
  const auth = "Basic " + btoa(`${opencode.username}:${opencode.password}`);

  const lockKey = `f/notion_tasks/dispatch_lock_${page_id.replace(/-/g, "")}`;
  const lockTTLMs = 120_000;
  const myJobId = process.env.WM_JOB_ID ?? `job-${Date.now()}`;

  const existingLock = await wmill.getState(lockKey).catch(() => null);
  if (existingLock && existingLock.owner !== myJobId) {
    const age = Date.now() - (existingLock.ts ?? 0);
    if (age < lockTTLMs) {
      console.log(`[dispatch] Lock held by ${existingLock.owner} (${age}ms ago) — skipping duplicate`);
      return { action: "skipped", reason: "duplicate" };
    }
    console.log(`[dispatch] Stale lock (${age}ms old) — overriding`);
  }

  await wmill.setState({ owner: myJobId, ts: Date.now() }, lockKey);

  // Read back to confirm ownership (reduces race window)
  await new Promise(r => setTimeout(r, 200));
  const confirmedLock = await wmill.getState(lockKey).catch(() => null);
  if (!confirmedLock || confirmedLock.owner !== myJobId) {
    console.log(`[dispatch] Lost lock race — another job claimed it`);
    return { action: "skipped", reason: "lost_lock" };
  }

  try {
    const page = await client.pages.retrieve({ page_id });
    if (!("properties" in page)) throw new Error("Partial page returned");
    const agentStatus = (page as any).properties[PROP_AGENT]?.select?.name;
    if (agentStatus !== STATUS_QUEUED) {
      console.log(`[dispatch] Agent = "${agentStatus}", not Queued — skipping`);
      return { action: "skipped", reason: "not_queued" };
    }
    const taskName = (page as any).properties[PROP_TASK_NAME]?.title?.[0]?.plain_text ?? "Untitled";

    // Set Running before creating the session — Notion state is the primary duplicate-dispatch guard
    await client.pages.update({
      page_id,
      properties: { [PROP_AGENT]: { select: { name: STATUS_RUNNING } } },
    });

    const intakePrompt = buildIntakePrompt(taskName, page_id);
    const sessionRes = await fetch(`${opencode.base_url}/session`, {
      method: "POST",
      headers: { "Authorization": auth, "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskName, model: OPENCODE_MODEL }),
    });
    if (!sessionRes.ok) throw new Error(`Session creation failed: ${sessionRes.status}`);
    const sessionBody = await sessionRes.text();
    const session = JSON.parse(sessionBody.slice(0, sessionBody.indexOf("<!doctype") > 0 ? sessionBody.indexOf("<!doctype") : undefined));
    const sessionId: string = session.id;
    const sessionUrl = `${opencode.base_url}/Lw/session/${sessionId}`;

    const promptRes = await fetch(`${opencode.base_url}/session/${sessionId}/message`, {
      method: "POST",
      headers: { "Authorization": auth, "Content-Type": "application/json" },
      body: JSON.stringify({ parts: [{ type: "text", text: intakePrompt }] }),
    });
    if (!promptRes.ok) throw new Error(`Prompt delivery failed: ${promptRes.status}`);

    await client.pages.update({
      page_id,
      properties: { [PROP_AGENT_SESSION]: { url: sessionUrl } },
    });

    console.log(`[dispatch] Done. Session: ${sessionId}, URL: ${sessionUrl}`);
    return { action: "dispatched", page_id, session_id: sessionId, session_url: sessionUrl };

  } catch (err: any) {
    console.error("[dispatch] Error:", err);
    try {
      await client.pages.update({
        page_id,
        properties: { [PROP_AGENT]: { select: { name: STATUS_FAILED } } },
      });
    } catch {}
    return { action: "failed", error: String(err) };
  } finally {
    try { await wmill.setState(null, lockKey); } catch {}
  }
}

function buildIntakePrompt(taskName: string, pageId: string): string {
  return `You are an autonomous agent working on behalf of Geoff Li.

## Task
**Name:** ${taskName}
**Notion Page ID:** ${pageId}

## Context Gathering
Before doing any work, use Notion MCP tools to understand the full context:
1. Fetch the task page (${pageId}) — read its content, properties, and linked resources.
2. If the task belongs to a project, fetch the project page and read its goals and context.
3. Fetch any tasks listed in "Depends On" or "Prepares For" properties to understand dependencies and sequencing.

Use your judgment on how deep to explore. If a dependency is incomplete, note it in your output and proceed.

## Execution
After gathering context, complete the task autonomously.
- Coding tasks: create a branch named \`agent/<short-slug>-<short-page-id>\`, make changes, push the branch. Do not push to main or open a PR unless asked.
- Research/writing tasks: produce a well-structured document and summarize key findings.
- If you cannot proceed without Geoff's input, describe exactly what you need and stop.

## Output
Write results back to the Notion task page using Notion MCP tools.

## Guardrails
- Do not commit credentials, secrets, or personal data.
- Do not delete production resources.
- Do not send messages or emails on Geoff's behalf.
- Do not purchase or subscribe to anything.`;
}
