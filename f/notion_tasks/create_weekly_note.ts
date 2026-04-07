import { Client } from "@notionhq/client";

// Asia/Shanghai is always UTC+8 (no DST)
const CST_OFFSET_MS = 8 * 3600_000;

function getNowInCST(): Date {
  return new Date(Date.now() + CST_OFFSET_MS);
}

function getCurrentWeekMonday(): Date {
  const now = getNowInCST();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday;
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Find the Thursday of the ISO week containing d (UTC-based)
function getISOWeekThursday(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date;
}

function getISOWeekNumber(d: Date): number {
  const thursday = getISOWeekThursday(d);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ISO week year may differ from calendar year around Jan/Dec
function getISOWeekYear(d: Date): number {
  return getISOWeekThursday(d).getUTCFullYear();
}

function formatWeeklyNoteName(monday: Date): string {
  const weekNum = getISOWeekNumber(monday);
  const weekYear = getISOWeekYear(monday);
  return `${weekYear} W${String(weekNum).padStart(2, "0")}`;
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

function buildWeeklyNoteBlocks(dates: string[]): any[] {
  const dateBlocks = dates.map((isoDate) => ({
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: isoDate } }],
      children: [{ type: "paragraph", paragraph: { rich_text: [] } }],
    },
  }));
  return [...dateBlocks, { type: "paragraph", paragraph: { rich_text: [] } }];
}

export async function main(notion: RT.Notion, weekly_notes_database_id: string) {
  const client = new Client({ auth: notion.token });

  const monday = getCurrentWeekMonday();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(formatDate(d));
  }
  const startDate = dates[0];
  const endDate = dates[6];
  const pageName = formatWeeklyNoteName(monday);

  console.log(`Week: ${pageName} (${startDate} → ${endDate})`);

  // v5 SDK: databases.query removed, use dataSources.query
  const dataSourceId = await getDataSourceId(client, weekly_notes_database_id);
  const existing = await (client as any).dataSources.query({
    data_source_id: dataSourceId,
    filter: { property: "Date", date: { equals: startDate } },
    page_size: 1,
  });

  if (existing.results.length > 0) {
    console.log("Weekly note already exists, skipping");
    return { action: "skipped_existing", page_name: pageName, start_date: startDate };
  }

  const page = await client.pages.create({
    parent: { database_id: weekly_notes_database_id },
    properties: {
      Name: { title: [{ type: "text", text: { content: pageName } }] },
      Date: { date: { start: startDate, end: endDate } },
    },
    children: buildWeeklyNoteBlocks(dates),
  });

  console.log(`Created: ${pageName} (${page.id})`);

  return {
    action: "created",
    page_id: page.id,
    page_name: pageName,
    start_date: startDate,
    end_date: endDate,
  };
}
