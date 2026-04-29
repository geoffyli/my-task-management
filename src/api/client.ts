import type { Task, Project, Area } from "./types";

let refreshUntil = 0;

export function setForceRefresh() {
  refreshUntil = Date.now() + 1000;
}

async function fetchApi<T>(path: string): Promise<T> {
  const url = Date.now() < refreshUntil ? `${path}${path.includes("?") ? "&" : "?"}refresh=true` : path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getTasks: () => fetchApi<Task[]>("/api/tasks"),
  getProjects: () => fetchApi<Project[]>("/api/projects"),
  getAreas: () => fetchApi<Area[]>("/api/areas"),
};
