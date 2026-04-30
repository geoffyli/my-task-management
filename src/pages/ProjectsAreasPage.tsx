import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { useTasks, useProjects, useAreas } from "@/api/queries";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { getProjectHealth, buildTasksByProjectIndex, getAtRiskProjects } from "@/lib/metrics";
import { STATUS_COLORS, TOOLTIP_STYLE } from "@/lib/constants";
import type { Task } from "@/api/types";

export function ProjectsAreasPage() {
  const { data: tasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const { data: projects, isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
  const { data: areas, isLoading: areasLoading, isError: areasError, refetch: refetchAreas } = useAreas();

  const tasksByProject = useMemo(
    () => (tasks ? buildTasksByProjectIndex(tasks) : new Map<string, Task[]>()),
    [tasks]
  );

  const health = useMemo(
    () => (tasks && projects ? getProjectHealth(tasks, projects) : []),
    [tasks, projects]
  );

  const atRisk = useMemo(
    () => (tasks && projects ? getAtRiskProjects(tasks, projects) : []),
    [tasks, projects]
  );

  const areaTasksMap = useMemo(() => {
    if (!tasks || !projects || !areas) return new Map<string, Task[]>();

    const projectToArea = new Map<string, string[]>();
    for (const p of projects) {
      for (const areaId of p.areaIds) {
        const list = projectToArea.get(areaId);
        if (list) list.push(p.id);
        else projectToArea.set(areaId, [p.id]);
      }
    }

    const result = new Map<string, Task[]>();
    for (const area of areas) {
      const areaProjectIds = new Set(projectToArea.get(area.id) ?? []);
      const areaTasks = tasks.filter((t) => t.projectIds.some((pid) => areaProjectIds.has(pid)));
      result.set(area.id, areaTasks);
    }
    return result;
  }, [tasks, projects, areas]);

  const workload = useMemo(() => {
    if (!areas) return [];
    return areas.map((area) => {
      const areaTasks = areaTasksMap.get(area.id) ?? [];
      return {
        area: area.name.length > 20 ? area.name.slice(0, 18) + "\u2026" : area.name,
        fullName: area.name,
        notStarted: areaTasks.filter((t) => t.status === "Not Started").length,
        inProgress: areaTasks.filter((t) => t.status === "In Progress").length,
        done: areaTasks.filter((t) => t.status === "Done").length,
        total: areaTasks.length,
      };
    }).filter((a) => a.total > 0);
  }, [areas, areaTasksMap]);

  if (tasksLoading || projectsLoading || areasLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (tasksError || projectsError || areasError) {
    return <ErrorFallback message="Failed to load data" onRetry={() => { refetchTasks(); refetchProjects(); refetchAreas(); }} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Projects & Areas</h2>

      {/* Project Health */}
      <ChartContainer title="Project Health" description="Task status distribution per project">
        {health.length === 0 ? <EmptyState message="No project data available" /> : (
          <ResponsiveContainer width="100%" height={Math.max(280, health.length * 40)}>
            <BarChart data={health} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="project" tick={{ fontSize: 11 }} width={110} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="notStarted" stackId="status" fill={STATUS_COLORS["Not Started"]} name="Not Started" />
              <Bar dataKey="inProgress" stackId="status" fill={STATUS_COLORS["In Progress"]} name="In Progress" />
              <Bar dataKey="done" stackId="status" fill={STATUS_COLORS["Done"]} name="Done" />
              <Bar dataKey="deferred" stackId="status" fill={STATUS_COLORS["Deferred"]} name="Deferred" />
              <Bar dataKey="cancelled" stackId="status" fill={STATUS_COLORS["Cancelled"]} name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* Area Workload */}
      <ChartContainer title="Area Workload" description="Task status distribution across areas">
        {workload.length === 0 ? <EmptyState message="No area data available" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workload} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => workload.find((w) => w.area === label)?.fullName ?? String(label)}
              />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="notStarted" stackId="status" fill={STATUS_COLORS["Not Started"]} name="Not Started" />
              <Bar dataKey="inProgress" stackId="status" fill={STATUS_COLORS["In Progress"]} name="In Progress" />
              <Bar dataKey="done" stackId="status" fill={STATUS_COLORS["Done"]} name="Done" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* At Risk */}
      {atRisk.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="text-sm font-medium text-foreground">At Risk Projects</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {atRisk.map(({ project, reason }) => (
              <div key={project.id} className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                <p className="text-sm font-medium text-foreground">{project.name}</p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Progress Cards */}
      <ChartContainer title="Project Progress" description="Completion percentage per project">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((p) => {
            const projectTasks = tasksByProject.get(p.id) ?? [];
            const done = projectTasks.filter((t) => t.status === "Done").length;
            const total = projectTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div key={p.id} className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-green-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {done}/{total} tasks done • {p.priority} priority
                </p>
              </div>
            );
          })}
        </div>
      </ChartContainer>
    </div>
  );
}
