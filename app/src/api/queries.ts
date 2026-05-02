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

export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync", "status"],
    queryFn: api.getSyncStatus,
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });
}

export function useSyncEvents(limit: number, offset: number) {
  return useQuery({
    queryKey: ["sync", "events", limit, offset],
    queryFn: () => api.getSyncEvents(limit, offset),
    staleTime: 30 * 1000,
  });
}

export function useWebhookStatus() {
  return useQuery({
    queryKey: ["webhook-status"],
    queryFn: api.getWebhookStatus,
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });
}
