export type NotionPage = {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
};

type QueryBody = {
  filter?: any;
  sorts?: any[];
};

const INTER_PAGE_DELAY_MS = 350;
const MAX_RETRIES = 3;
const MAX_RESULTS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  payload: any
): Promise<any> {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) return res.json();

    if (res.status === 429) {
      const retryAfter = (Number(res.headers.get("Retry-After")) || 1) * 1000;
      console.warn(`[notion] Rate limited (429), retrying in ${retryAfter}ms (attempt ${attempt}/${MAX_RETRIES})`);
      if (attempt > MAX_RETRIES) {
        throw new Error(`Notion API rate limited after ${MAX_RETRIES} retries`);
      }
      await sleep(retryAfter);
      continue;
    }

    if (res.status >= 500 && attempt <= MAX_RETRIES) {
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.warn(`[notion] Server error ${res.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(delay);
      continue;
    }

    const text = await res.text();
    throw new Error(`Notion API error ${res.status}: ${text}`);
  }
}

function checkRelationTruncation(results: NotionPage[]): void {
  for (const page of results) {
    for (const [propName, prop] of Object.entries(page.properties)) {
      if (prop?.type === "relation" && prop?.has_more === true) {
        console.warn(
          `[notion] WARN: Relation "${propName}" truncated on page ${page.id} (>${(prop.relation as any[]).length} items). Some data may be missing.`
        );
      }
    }
  }
}

export async function queryDatabase(
  apiKey: string,
  dataSourceId: string,
  body: QueryBody
): Promise<NotionPage[]> {
  const allPages: NotionPage[] = [];
  let cursor: string | undefined = undefined;
  let pageNum = 0;
  const startTime = Date.now();

  do {
    pageNum++;
    const payload: any = { ...body, page_size: 100 };
    if (cursor) payload.start_cursor = cursor;

    const data = await fetchWithRetry(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      payload
    );

    const results = data.results as NotionPage[];
    allPages.push(...results);

    checkRelationTruncation(results);

    if (allPages.length >= MAX_RESULTS) {
      console.warn(`[notion] WARN: Hit ${MAX_RESULTS} result cap for data source ${dataSourceId}. Data may be incomplete.`);
      break;
    }

    cursor = data.has_more ? data.next_cursor : undefined;

    if (cursor) await sleep(INTER_PAGE_DELAY_MS);
  } while (cursor);

  const elapsed = Date.now() - startTime;
  console.log(`[notion] ${dataSourceId.slice(0, 8)}…: ${allPages.length} results in ${pageNum} pages (${elapsed}ms)`);

  return allPages;
}
