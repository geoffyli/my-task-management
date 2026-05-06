import { Client } from "@notionhq/client";

type NotionPage = {
  id: string;
  properties: Record<string, any>;
};

type LegacyTask = {
  id: string;
  title: string;
  assignedDate: string | null;
  status: string;
};

function getDateInCST(offsetDays: number = 0): string {
  const now = new Date();
  const cst = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
  );
  cst.setDate(cst.getDate() + offsetDays);
  const y = cst.getFullYear();
  const m = String(cst.getMonth() + 1).padStart(2, "0");
  const d = String(cst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function extractTask(page: NotionPage): LegacyTask {
  const props = page.properties;

  const title =
    props["Task Name"]?.type === "title"
      ? props["Task Name"]?.title?.[0]?.plain_text || "Untitled Task"
      : "Untitled Task";

  const assignedDate =
    props["Assigned Date"]?.type === "date"
      ? props["Assigned Date"]?.date?.start || null
      : null;

  const status =
    props["Status"]?.type === "select"
      ? props["Status"]?.select?.name || "No Status"
      : "No Status";

  return { id: page.id, title, assignedDate, status };
}

async function queryAllLegacyTasks(
  client: Client,
  databaseId: string,
  beforeDate: string
): Promise<LegacyTask[]> {
  // v5 SDK: databases.query was replaced by dataSources.query
  // First, retrieve the data_source_id from the database
  const db = await client.databases.retrieve({ database_id: databaseId });
  const dataSourceId = (db as any).data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error(
      `No data source found for database ${databaseId}. Check that the database exists and the integration has access.`
    );
  }

  const tasks: LegacyTask[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await (client as any).dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        and: [
          {
            property: "Assigned Date",
            date: { on_or_before: beforeDate },
          },
          {
            property: "Status",
            select: { does_not_equal: "Blocked" },
          },
          {
            property: "Status",
            select: { does_not_equal: "Done" },
          },
          {
            property: "Status",
            select: { does_not_equal: "Cancelled" },
          },
        ],
      },
      page_size: 100,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      if (page.object === "page" && "properties" in page) {
        tasks.push(extractTask(page as NotionPage));
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return tasks;
}

export async function main(notion: RT.Notion, tasks_database_id: string) {
  const client = new Client({ auth: notion.token });

  const today = getDateInCST(0);
  const yesterday = getDateInCST(-1);

  console.log(`Querying legacy tasks (assigned on or before ${yesterday})...`);

  const legacyTasks = await queryAllLegacyTasks(
    client,
    tasks_database_id,
    yesterday
  );

  console.log(`Found ${legacyTasks.length} legacy task(s)`);

  if (legacyTasks.length === 0) {
    return {
      tasks_found: 0,
      tasks_updated: 0,
      tasks_failed: 0,
      execution_date: today,
      timezone: "Asia/Shanghai",
    };
  }

  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const task of legacyTasks) {
    try {
      await client.pages.update({
        page_id: task.id,
        properties: {
          "Assigned Date": { date: { start: today } },
        },
      });
      updated++;
      console.log(`Updated: "${task.title}" (${task.assignedDate} -> ${today})`);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${task.title}: ${msg}`);
      console.error(`Failed: "${task.title}" - ${msg}`);
    }
  }

  console.log(
    `Done: ${updated} updated, ${failed} failed out of ${legacyTasks.length}`
  );

  return {
    tasks_found: legacyTasks.length,
    tasks_updated: updated,
    tasks_failed: failed,
    errors: errors.length > 0 ? errors : undefined,
    execution_date: today,
    timezone: "Asia/Shanghai",
  };
}
