import { fetchPage, getNotionKey, type NotionPage } from "../sync/notion-client";
import { extractRelationIds } from "../db/store";

export interface NetworkNode {
  id: string;
  label: string;
  fullName: string;
  status: string;
  level: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: "dependency" | "related";
}

export interface LevelResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  level: number;
}

function extractTitle(page: NotionPage): string {
  const titleProp = page.properties["Task Name"];
  if (titleProp?.type === "title" && Array.isArray(titleProp.title)) {
    return titleProp.title.map((t: any) => t.plain_text).join("") || "Untitled";
  }
  return "Untitled";
}

function extractStatus(page: NotionPage): string {
  const statusProp = page.properties["Status"];
  if (statusProp?.type === "select" && statusProp.select) {
    return statusProp.select.name;
  }
  return "Unknown";
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

const BATCH_CONCURRENCY = 3;
const INTER_REQUEST_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBatch(ids: string[], apiKey: string): Promise<Map<string, NotionPage>> {
  const results = new Map<string, NotionPage>();
  for (let i = 0; i < ids.length; i += BATCH_CONCURRENCY) {
    const batch = ids.slice(i, i + BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((id) => fetchPage(apiKey, id))
    );
    for (let j = 0; j < settled.length; j++) {
      const result = settled[j]!;
      const pageId = batch[j]!;
      if (result.status === "fulfilled") {
        results.set(pageId, result.value);
      } else {
        console.warn(`[network] Failed to fetch page ${pageId}: ${result.reason}`);
      }
    }
    if (i + BATCH_CONCURRENCY < ids.length) {
      await sleep(INTER_REQUEST_DELAY_MS);
    }
  }
  return results;
}

export async function* traverseNetwork(focalId: string): AsyncGenerator<LevelResult> {
  const apiKey = getNotionKey();
  const visited = new Set<string>();
  const edgeSet = new Set<string>();
  let frontier = [focalId];
  let level = 0;

  while (frontier.length > 0) {
    const toFetch = frontier.filter((id) => !visited.has(id));
    if (toFetch.length === 0) break;

    const pages = await fetchBatch(toFetch, apiKey);
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    let nextFrontier: string[] = [];

    for (const id of toFetch) {
      visited.add(id);
      const page = pages.get(id);
      if (!page) continue;

      const fullName = extractTitle(page);
      nodes.push({
        id,
        label: truncate(fullName, 30),
        fullName,
        status: extractStatus(page),
        level,
      });

      const dependsOn = extractRelationIds(page.properties["Depends on"]);
      const preparesFor = extractRelationIds(page.properties["Prepares for"]);
      const relatedTasks = extractRelationIds(page.properties["Related Tasks"]);

      for (const depId of dependsOn) {
        const edgeId = `dep:${depId}->${id}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ id: edgeId, source: depId, target: id, type: "dependency" });
        }
        if (!visited.has(depId)) nextFrontier.push(depId);
      }

      for (const prepId of preparesFor) {
        const edgeId = `dep:${id}->${prepId}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ id: edgeId, source: id, target: prepId, type: "dependency" });
        }
        if (!visited.has(prepId)) nextFrontier.push(prepId);
      }

      for (const relId of relatedTasks) {
        const pair = [id, relId].sort().join("<->");
        const edgeId = `rel:${pair}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ id: edgeId, source: id, target: relId, type: "related" });
        }
        if (!visited.has(relId)) nextFrontier.push(relId);
      }
    }

    if (nodes.length > 0 || edges.length > 0) {
      yield { nodes, edges, level };
    }

    frontier = [...new Set(nextFrontier)];
    level++;
  }
}
