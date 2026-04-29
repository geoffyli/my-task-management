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
