import type { Task, Project, Area, SyncStatus, SyncEvent, WebhookStatus, PushDevice, NotificationPreferences } from "./types";
import { getStoredToken } from "@/lib/auth";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
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

  // Push notifications
  getVapidKey: () => fetchApi<{ publicKey: string }>("/api/push/vapid-key"),
  pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent: string }) =>
    fetchApi<{ ok: true; deviceId: number }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) }),
  pushUnsubscribe: (endpoint: string) =>
    fetchApi<{ ok: true }>("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) }),
  getDevices: () => fetchApi<PushDevice[]>("/api/push/devices"),
  updateDevice: (id: number, name: string) =>
    fetchApi<{ ok: true }>(`/api/push/devices/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteDevice: (id: number) =>
    fetchApi<{ ok: true }>(`/api/push/devices/${id}`, { method: "DELETE" }),
  getNotificationPreferences: () => fetchApi<NotificationPreferences>("/api/push/preferences"),
  updateGlobalPreferences: (prefs: Record<string, unknown>) =>
    fetchApi<{ ok: true }>("/api/push/preferences", { method: "PUT", body: JSON.stringify(prefs) }),
  updateDevicePreferences: (deviceId: number, prefs: Record<string, unknown>) =>
    fetchApi<{ ok: true }>(`/api/push/preferences/${deviceId}`, { method: "PUT", body: JSON.stringify(prefs) }),
  deleteDevicePreferences: (deviceId: number) =>
    fetchApi<{ ok: true }>(`/api/push/preferences/${deviceId}`, { method: "DELETE" }),
  sendTestNotification: (endpoint: string) =>
    fetchApi<{ ok: true }>("/api/push/test", { method: "POST", body: JSON.stringify({ endpoint }) }),
};
