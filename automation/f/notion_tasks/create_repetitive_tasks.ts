import { Client } from "@notionhq/client";
import { CronExpressionParser } from "cron-parser";

// Asia/Shanghai is always UTC+8 (no DST)
const CST_OFFSET_MS = 8 * 3600_000;

interface RepetitiveTaskConfig {
  id: string;
  name: string;
  dateRange: { start: string | null; end: string | null };
  mode: "Cron" | "Interval";
  value: string;
  priority: string | null;
  projects: string[];
}

function formatDateCST(date: Date): string {
  const d = new Date(date.getTime() + CST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getTodayCST(): string {
  return formatDateCST(new Date());
}

function isDateInRange(today: string, start: string | null, end: string | null): boolean {
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

function validateCronInterval(cronExpr: string): { valid: boolean; error?: string } {
  try {
    // Use a fixed date so the two-sample gap is deterministic regardless of when validation runs
    const interval = CronExpressionParser.parse(cronExpr, {
      currentDate: new Date("2026-01-01T00:00:00+08:00"),
      tz: "Asia/Shanghai",
    });
    const first = interval.next();
    const second = interval.next();
    const diffMs = second.getTime() - first.getTime();
    if (diffMs < 24 * 3600_000) {
      return { valid: false, error: `Cron interval < 1 day (${(diffMs / 3600_000).toFixed(1)}h)` };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Invalid cron: ${e instanceof Error ? e.message : e}` };
  }
}

function shouldCronTriggerToday(cronExpr: string, todayStr: string): boolean {
  try {
    const endOfDay = new Date(todayStr + "T23:59:59+08:00");
    const interval = CronExpressionParser.parse(cronExpr, {
      currentDate: endOfDay,
      tz: "Asia/Shanghai",
    });
    const prev = interval.prev();
    return formatDateCST(prev) === todayStr;
  } catch {
    return false;
  }
}

function shouldCreateIntervalTask(
  previousDateStr: string | null,
  intervalDays: number,
  todayStr: string
): boolean {
  if (!previousDateStr) return true;
  const prev = new Date(previousDateStr + "T00:00:00Z");
  const today = new Date(todayStr + "T00:00:00Z");
  const diffDays = Math.floor((today.getTime() - prev.getTime()) / 86400000);
  return diffDays >= intervalDays;
}

const UNSUPPORTED_BLOCK_TYPES = new Set([
  "child_database",
  "child_page",
  "link_preview",
  "meeting_notes",
  "unsupported",
]);

const RESPONSE_ONLY_CONTENT_KEYS = new Set([
  "children",
  "list_start_index",
  "list_format",
]);

function sanitizeRichTextItem(item: any): any {
  if (item.type === "mention") {
    const mentionType = item.mention?.type;
    if (mentionType === "link_mention" || mentionType === "link_preview") {
      const href =
        item.mention[mentionType]?.href ||
        item.mention[mentionType]?.url ||
        item.href;
      const label = item.plain_text || href || "";
      return {
        type: "text",
        text: { content: label, ...(href ? { link: { url: href } } : {}) },
        ...(item.annotations ? { annotations: item.annotations } : {}),
      };
    }
  }
  const { plain_text, href, ...rest } = item;
  return rest;
}

function sanitizeBlock(block: any): any | null {
  const type: string = block.type;
  if (UNSUPPORTED_BLOCK_TYPES.has(type)) return null;
  const content = block[type];
  if (!content) return null;

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(content)) {
    if (RESPONSE_ONLY_CONTENT_KEYS.has(k)) continue;
    if (v === null) continue;
    if (k === "rich_text" && Array.isArray(v)) {
      cleaned[k] = v.map(sanitizeRichTextItem);
    } else {
      cleaned[k] = v;
    }
  }
  return { type, [type]: cleaned };
}

async function fetchBlockChildren(
  client: Client,
  blockId: string,
  maxDepth: number = 3
): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of response.results as any[]) {
      const sanitized = sanitizeBlock(block);
      if (!sanitized) continue;
      if (block.has_children && maxDepth > 1) {
        const children = await fetchBlockChildren(client, block.id, maxDepth - 1);
        if (children.length > 0) {
          sanitized[sanitized.type].children = children;
        }
      }
      blocks.push(sanitized);
    }
    cursor = response.has_more ? (response as any).next_cursor : undefined;
  } while (cursor);

  return blocks;
}

async function findTemplateBlocks(
  client: Client,
  configPageId: string
): Promise<any[] | null> {
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: configPageId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of response.results as any[]) {
      if (
        block.type === "heading_2" &&
        block.has_children &&
        block.heading_2?.rich_text
          ?.map((t: any) => t.plain_text)
          .join("")
          .trim() === "Template"
      ) {
        const children = await fetchBlockChildren(client, block.id);
        return children.length > 0 ? children : null;
      }
    }
    cursor = response.has_more ? (response as any).next_cursor : undefined;
  } while (cursor);

  return null;
}

async function getDataSourceId(client: Client, databaseId: string): Promise<string> {
  const db = await client.databases.retrieve({ database_id: databaseId });
  const dsId = (db as any).data_sources?.[0]?.id;
  if (!dsId) {
    throw new Error(
      `No data source found for database ${databaseId}. Check that the database exists and the integration has access.`
    );
  }
  return dsId;
}

function extractConfigEntry(page: any): RepetitiveTaskConfig | null {
  if (page.object !== "page" || !("properties" in page)) return null;
  const props = page.properties;

  const name =
    props.Name?.type === "title" ? props.Name?.title?.[0]?.plain_text : null;
  if (!name) return null;

  const mode =
    props.Mode?.type === "select" ? props.Mode?.select?.name : null;
  if (mode !== "Cron" && mode !== "Interval") return null;

  const value =
    props.Value?.type === "rich_text" ? props.Value?.rich_text?.[0]?.plain_text : null;
  if (!value) return null;

  const dateRange =
    props["Date Range"]?.type === "date"
      ? { start: props["Date Range"]?.date?.start || null, end: props["Date Range"]?.date?.end || null }
      : { start: null, end: null };

  const priority =
    props.Priority?.type === "select" ? props.Priority?.select?.name || null : null;

  const projects =
    props.Projects?.type === "relation"
      ? props.Projects?.relation.map((r: { id: string }) => r.id)
      : [];

  return { id: page.id, name, dateRange, mode, value, priority, projects };
}

function buildTaskProperties(config: RepetitiveTaskConfig, today: string): Record<string, any> {
  const properties: Record<string, any> = {
    "Task Name": { title: [{ type: "text", text: { content: `[Repetitive] ${config.name}` } }] },
    "Assigned Date": { date: { start: today } },
    "Initial Assigned Date": { date: { start: today } },
    Status: { select: { name: "Not Started" } },
  };
  if (config.priority) {
    properties.Priority = { select: { name: config.priority } };
  }
  if (config.projects.length > 0) {
    properties.Project = { relation: config.projects.map((id) => ({ id })) };
  }
  return properties;
}

export async function main(
  notion: RT.Notion,
  config_database_id: string,
  tasks_database_id: string
) {
  const client = new Client({ auth: notion.token });
  const today = getTodayCST();

  console.log(`Processing repetitive tasks for ${today}`);

  // v5 SDK: databases.query removed, resolve data source IDs first
  const [configDsId, tasksDsId] = await Promise.all([
    getDataSourceId(client, config_database_id),
    getDataSourceId(client, tasks_database_id),
  ]);

  const configResult = await (client as any).dataSources.query({
    data_source_id: configDsId,
    page_size: 100,
  });

  const configs: RepetitiveTaskConfig[] = [];
  for (const item of configResult.results) {
    const entry = extractConfigEntry(item);
    if (entry) configs.push(entry);
  }

  console.log(`Found ${configs.length} valid config(s)`);

  let created = 0;
  let templated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const config of configs) {
    try {
      if (!isDateInRange(today, config.dateRange.start, config.dateRange.end)) {
        console.log(`"${config.name}": outside date range, skipping`);
        skipped++;
        continue;
      }

      let shouldCreate = false;

      if (config.mode === "Cron") {
        const validation = validateCronInterval(config.value);
        if (!validation.valid) {
          console.error(`"${config.name}": ${validation.error}`);
          failed++;
          errors.push(`${config.name}: ${validation.error}`);
          continue;
        }
        shouldCreate = shouldCronTriggerToday(config.value, today);
        console.log(`"${config.name}" (Cron ${config.value}): trigger=${shouldCreate}`);
      } else {
        const intervalDays = parseInt(config.value, 10);
        if (isNaN(intervalDays) || intervalDays < 1) {
          console.error(`"${config.name}": invalid interval "${config.value}"`);
          failed++;
          errors.push(`${config.name}: invalid interval "${config.value}"`);
          continue;
        }

        // Find most recent task with this name
        const prevResult = await (client as any).dataSources.query({
          data_source_id: tasksDsId,
          filter: {
            property: "Task Name",
            title: { equals: `[Repetitive] ${config.name}` },
          },
          sorts: [{ property: "Assigned Date", direction: "descending" }],
          page_size: 1,
        });

        const prevDate =
          prevResult.results.length > 0 &&
          prevResult.results[0].properties?.["Assigned Date"]?.date?.start
            ? prevResult.results[0].properties["Assigned Date"].date.start
            : null;

        shouldCreate = shouldCreateIntervalTask(prevDate, intervalDays, today);
        console.log(`"${config.name}" (Interval ${intervalDays}d, last=${prevDate ?? "none"}): trigger=${shouldCreate}`);
      }

      if (!shouldCreate) {
        skipped++;
        continue;
      }

      const dupResult = await (client as any).dataSources.query({
        data_source_id: tasksDsId,
        filter: {
          and: [
            { property: "Task Name", title: { equals: `[Repetitive] ${config.name}` } },
            { property: "Assigned Date", date: { equals: today } },
          ],
        },
        page_size: 1,
      });

      if (dupResult.results.length > 0) {
        console.log(`"${config.name}": already exists for today, skipping`);
        skipped++;
        continue;
      }

      let templateBlocks: any[] | null = null;
      try {
        templateBlocks = await findTemplateBlocks(client, config.id);
        if (templateBlocks) {
          console.log(`"${config.name}": found ${templateBlocks.length} template block(s)`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`"${config.name}": template fetch failed, creating without body: ${msg}`);
      }

      const createParams: any = {
        parent: { database_id: tasks_database_id },
        properties: buildTaskProperties(config, today),
      };
      if (templateBlocks && templateBlocks.length > 0) {
        createParams.children = templateBlocks;
      }
      const page = await client.pages.create(createParams);

      if (templateBlocks && templateBlocks.length > 0) templated++;
      created++;
      console.log(`Created: "[Repetitive] ${config.name}" (${page.id})`);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${config.name}: ${msg}`);
      console.error(`"${config.name}": ${msg}`);
    }
  }

  console.log(`Done: ${created} created (${templated} with template), ${skipped} skipped, ${failed} failed`);

  return {
    execution_date: today,
    configs_found: configs.length,
    tasks_created: created,
    tasks_with_template: templated,
    skipped,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}
