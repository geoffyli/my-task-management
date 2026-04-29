import type { Task, Project, Area } from "./types";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getTasks: () => fetchApi<Task[]>("/api/tasks"),
  getProjects: () => fetchApi<Project[]>("/api/projects"),
  getAreas: () => fetchApi<Area[]>("/api/areas"),
};
