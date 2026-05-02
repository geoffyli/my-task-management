import type { Task, Project, Area, SyncStatus, SyncEvent, WebhookStatus } from "./types";
import { getStoredToken } from "@/lib/auth";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    ...options?.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getTasks: () => fetchApi<Task[]>("/api/tasks"),
  getProjects: () => fetchApi<Project[]>("/api/projects"),
  getAreas: () => fetchApi<Area[]>("/api/areas"),
  getSyncStatus: () => fetchApi<SyncStatus>("/api/status"),
  getSyncEvents: (limit = 50, offset = 0) =>
    fetchApi<SyncEvent[]>(`/api/events?limit=${limit}&offset=${offset}`),
  triggerSync: () => fetchApi<{ success: boolean; message: string }>("/api/sync", { method: "POST" }),
  getWebhookStatus: () => fetchApi<WebhookStatus>("/api/webhook-status"),
};
