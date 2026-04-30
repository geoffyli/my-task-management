import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: api.getTasks,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: api.getAreas,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminStatus(token: string) {
  return useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => api.getAdminStatus(token),
    staleTime: 30 * 1000,
    enabled: !!token,
    refetchInterval: 30000,
  });
}

export function useAdminEvents(token: string, limit: number, offset: number) {
  return useQuery({
    queryKey: ["admin", "events", limit, offset],
    queryFn: () => api.getAdminEvents(token, limit, offset),
    staleTime: 30 * 1000,
    enabled: !!token,
  });
}

export function useWebhookStatus(token: string) {
  return useQuery({
    queryKey: ["admin", "webhook-status"],
    queryFn: () => api.getWebhookStatus(token),
    staleTime: 30 * 1000,
    enabled: !!token,
    refetchInterval: 30000,
  });
}
