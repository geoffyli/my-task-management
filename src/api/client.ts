import type { Task, Project, Area, SyncStatus, SyncEvent, WebhookStatus } from "./types";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  getTasks: () => fetchApi<Task[]>("/api/tasks"),
  getProjects: () => fetchApi<Project[]>("/api/projects"),
  getAreas: () => fetchApi<Area[]>("/api/areas"),
  getAdminStatus: (token: string) =>
    fetchApi<SyncStatus>("/api/admin/status", { headers: authHeaders(token) }),
  getAdminEvents: (token: string, limit = 50, offset = 0) =>
    fetchApi<SyncEvent[]>(`/api/admin/events?limit=${limit}&offset=${offset}`, { headers: authHeaders(token) }),
  triggerSync: async (token: string) => {
    const res = await fetch("/api/admin/sync", { method: "POST", headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Sync failed");
    return data;
  },
  getWebhookStatus: (token: string) =>
    fetchApi<WebhookStatus>("/api/admin/webhook-status", { headers: authHeaders(token) }),
};
