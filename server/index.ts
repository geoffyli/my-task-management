import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFileSync } from "fs";
import { resolve } from "path";
import { queryDatabase, type NotionPage } from "./notion";
import type { Task, Project, Area } from "../src/api/types";

const app = new Hono();
app.use("*", cors());

const DATA_SOURCES = {
  tasks: "46f8ea4d-432a-4dd9-bc9a-dab4302c1cfe",
  projects: "81899362-e971-4a82-ba25-18fdda1d8f63",
  areas: "0b036eaf-a357-46ec-b479-b6bb88497b74",
};

const NOTION_KEY = readFileSync(
  resolve(process.env.HOME || "~", ".config/notion/api_key"),
  "utf-8"
).trim();

function extractTitle(prop: any): string {
  return prop?.title?.[0]?.plain_text ?? "(untitled)";
}

function extractSelect(prop: any): string | null {
  return prop?.select?.name ?? null;
}

function extractDate(prop: any): string | null {
  return prop?.date?.start ?? null;
}

function extractRelationIds(prop: any): string[] {
  return (prop?.relation ?? []).map((r: any) => r.id);
}

function normalizeTask(page: NotionPage): Task {
  const p = page.properties;
  return {
    id: page.id,
    name: extractTitle(p["Task Name"]),
    status: (extractSelect(p["Status"]) as Task["status"]) ?? "Not Started",
    priority: (extractSelect(p["Priority"]) as Task["priority"]) ?? "Medium",
    projectId: extractRelationIds(p["Project"])[0] ?? null,
    assignedDate: extractDate(p["Assigned Date"]),
    initialAssignedDate: extractDate(p["Initial Assigned Date"]),
    deadline: extractDate(p["Deadline"]),
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    dependencies: extractRelationIds(p["Depands on"]),
  };
}

function normalizeProject(page: NotionPage): Project {
  const p = page.properties;
  return {
    id: page.id,
    name: extractTitle(p["Name"]),
    status:
      (extractSelect(p["Status"]) as Project["status"]) ?? "In Progress",
    priority:
      (extractSelect(p["Priority"]) as Project["priority"]) ?? "Medium",
    areaIds: extractRelationIds(p["Areas"]),
    startDate: p["Date"]?.date?.start ?? null,
    endDate: p["Date"]?.date?.end ?? null,
  };
}

function normalizeArea(page: NotionPage): Area {
  const p = page.properties;
  return {
    id: page.id,
    name: extractTitle(p["Area Name"]),
  };
}

const CACHE_TTL = 60_000;
const cache = new Map<string, { data: unknown; expiry: number }>();

async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiry > now) return cached.data as T;
  const data = await fetcher();
  cache.set(key, { data, expiry: now + CACHE_TTL });
  return data;
}

app.get("/api/tasks", async (c) => {
  const tasks = await getCached("tasks", async () => {
    const pages = await queryDatabase(NOTION_KEY, DATA_SOURCES.tasks, {});
    return pages.map(normalizeTask);
  });
  return c.json(tasks);
});

app.get("/api/projects", async (c) => {
  const projects = await getCached("projects", async () => {
    const pages = await queryDatabase(NOTION_KEY, DATA_SOURCES.projects, {});
    return pages.map(normalizeProject);
  });
  return c.json(projects);
});

app.get("/api/areas", async (c) => {
  const areas = await getCached("areas", async () => {
    const pages = await queryDatabase(NOTION_KEY, DATA_SOURCES.areas, {});
    return pages.map(normalizeArea);
  });
  return c.json(areas);
});

export default {
  port: 3456,
  fetch: app.fetch,
};

console.log("Task Management Analytics API running on http://localhost:3456");
