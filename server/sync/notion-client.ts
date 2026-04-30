import { readFileSync } from "fs";
import { resolve } from "path";

export type NotionPage = {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, any>;
};

export const DATA_SOURCES: Record<string, string> = {
  tasks: "46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe",
  projects: "81899362-e971-4a82-ba25-18fdda1d8f63",
  areas: "0b036eaf-a357-46ec-b479-b6bb88497b74",
};

let _cachedNotionKey: string | null = null;

export function getNotionKey(): string {
  if (_cachedNotionKey) return _cachedNotionKey;
  if (process.env.NOTION_API_KEY) {
    _cachedNotionKey = process.env.NOTION_API_KEY;
    return _cachedNotionKey;
  }
  try {
    _cachedNotionKey = readFileSync(
      resolve(process.env.HOME || "~", ".config/notion/api_key"),
      "utf-8"
    ).trim();
    return _cachedNotionKey;
  } catch {
    throw new Error("NOTION_API_KEY env var not set and ~/.config/notion/api_key not found");
  }
}

const NOTION_VERSION = "2025-09-03";
const INTER_PAGE_DELAY_MS = 350;
const MAX_RETRIES = 3;
const MAX_RESULTS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkRelationTruncation(results: NotionPage[]): void {
  for (const page of results) {
    for (const [propName, prop] of Object.entries(page.properties)) {
      if (prop?.type === "relation" && prop?.has_more === true) {
        console.warn(
          `[notion] Relation "${propName}" truncated on page ${page.id} (>${(prop.relation as any[]).length} items). Data may be incomplete.`
        );
      }
    }
  }
}

async function fetchWithRetry(
  url: string,
  method: "GET" | "POST",
  headers: Record<string, string>,
  payload?: any
): Promise<any> {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const options: RequestInit = { method, headers };
    if (payload) options.body = JSON.stringify(payload);

    const res = await fetch(url, options);

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

function notionHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

export async function queryDatabase(
  apiKey: string,
  dataSourceId: string,
  body: { filter?: any; sorts?: any[] } = {}
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
      "POST",
      notionHeaders(apiKey),
      payload
    );

    const results = data.results as NotionPage[];
    allPages.push(...results);
    checkRelationTruncation(results);

    if (allPages.length >= MAX_RESULTS) {
      console.warn(`[notion] Hit ${MAX_RESULTS} result cap for ${dataSourceId.slice(0, 8)}…`);
      break;
    }

    cursor = data.has_more ? data.next_cursor : undefined;
    if (cursor) await sleep(INTER_PAGE_DELAY_MS);
  } while (cursor);

  const elapsed = Date.now() - startTime;
  console.log(`[notion] ${dataSourceId.slice(0, 8)}…: ${allPages.length} results in ${pageNum} pages (${elapsed}ms)`);

  return allPages;
}

export async function queryDatabaseIncremental(
  apiKey: string,
  dataSourceId: string,
  sinceTime: string
): Promise<NotionPage[]> {
  return queryDatabase(apiKey, dataSourceId, {
    filter: {
      timestamp: "last_edited_time",
      last_edited_time: { after: sinceTime },
    },
    sorts: [{ timestamp: "last_edited_time", direction: "ascending" }],
  });
}

export async function fetchPage(apiKey: string, pageId: string): Promise<NotionPage> {
  const data = await fetchWithRetry(
    `https://api.notion.com/v1/pages/${pageId}`,
    "GET",
    notionHeaders(apiKey)
  );
  return data as NotionPage;
}
