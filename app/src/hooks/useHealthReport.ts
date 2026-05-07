import { useMemo } from "react";
import { useTasks, useProjects } from "@/api/queries";
import { computeHealthReport, type HealthReport } from "@/lib/health";

export function useHealthReport(cutoffDate: string | null): {
  report: HealthReport | null;
  isLoading: boolean;
} {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const report = useMemo(() => {
    if (!tasks || !projects) return null;
    return computeHealthReport(tasks, projects, cutoffDate);
  }, [tasks, projects, cutoffDate]);

  return { report, isLoading: tasksLoading || projectsLoading };
}

export function useHealthErrorCount(): number {
  const { report } = useHealthReport(null);
  return report?.errors ?? 0;
}
