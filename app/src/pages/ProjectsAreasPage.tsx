import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { useTasks, useProjects, useAreas } from "@/api/queries";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { getProjectHealth, buildTasksByProjectIndex, getAtRiskProjects } from "@/lib/metrics";
import { STATUS_COLORS } from "@/lib/constants";
import { useChartTheme } from "@/hooks/useChartTheme";
import type { Task } from "@/api/types";

export function ProjectsAreasPage() {
  const { data: tasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const { data: projects, isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
  const { data: areas, isLoading: areasLoading, isError: areasError, refetch: refetchAreas } = useAreas();
  const { chartTheme, tooltipStyle } = useChartTheme();

  const activeProjects = useMemo(
    () => projects?.filter((p) => p.status !== "Archived"),
    [projects]
  );

  const tasksByProject = useMemo(
    () => (tasks ? buildTasksByProjectIndex(tasks) : new Map<string, Task[]>()),
    [tasks]
  );

  const health = useMemo(
    () => (tasks && activeProjects ? getProjectHealth(tasks, activeProjects) : []),
    [tasks, activeProjects]
  );

  const atRisk = useMemo(
    () => (tasks && activeProjects ? getAtRiskProjects(tasks, activeProjects) : []),
    [tasks, activeProjects]
  );

  const areaTasksMap = useMemo(() => {
    if (!tasks || !activeProjects || !areas) return new Map<string, Task[]>();

    const projectToArea = new Map<string, string[]>();
    for (const p of activeProjects) {
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
  }, [tasks, activeProjects, areas]);

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
    return <LoadingState variant="page" />;
  }

  if (tasksError || projectsError || areasError) {
    return <ErrorFallback message="Failed to load data" onRetry={() => { refetchTasks(); refetchProjects(); refetchAreas(); }} />;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">Projects & Areas</h2>

      {/* Project Health */}
      <ChartContainer title="Project Health" description="Task status distribution per project">
        {health.length === 0 ? <EmptyState message="No project data available" /> : (
          <ResponsiveContainer width="100%" height={Math.max(280, health.length * 40)}>
            <BarChart data={health} layout="vertical" margin={chartTheme.marginWide}>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis type="number" allowDecimals={false} tick={chartTheme.axisTick} axisLine={chartTheme.axisLine} tickLine={false} />
              <YAxis type="category" dataKey="project" tick={chartTheme.axisTick} width={110} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={chartTheme.cursorFill} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={chartTheme.legend} />
              <Bar dataKey="notStarted" stackId="status" fill={STATUS_COLORS["Not Started"]} name="Not Started" />
              <Bar dataKey="inProgress" stackId="status" fill={STATUS_COLORS["In Progress"]} name="In Progress" />
              <Bar dataKey="done" stackId="status" fill={STATUS_COLORS["Done"]} name="Done" />
              <Bar dataKey="blocked" stackId="status" fill={STATUS_COLORS["Blocked"]} name="Blocked" />
              <Bar dataKey="cancelled" stackId="status" fill={STATUS_COLORS["Cancelled"]} name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* Area Workload */}
      <ChartContainer title="Area Workload" description="Task status distribution across areas">
        {workload.length === 0 ? <EmptyState message="No area data available" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workload} margin={chartTheme.marginArea}>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis dataKey="area" tick={chartTheme.axisTickSm} angle={-15} textAnchor="end" height={60} axisLine={chartTheme.axisLine} tickLine={false} />
              <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={chartTheme.cursorFill}
                labelFormatter={(label) => workload.find((w) => w.area === label)?.fullName ?? String(label)}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={chartTheme.legend} />
              <Bar dataKey="notStarted" stackId="status" fill={STATUS_COLORS["Not Started"]} name="Not Started" radius={[0, 0, 0, 0]} />
              <Bar dataKey="inProgress" stackId="status" fill={STATUS_COLORS["In Progress"]} name="In Progress" />
              <Bar dataKey="done" stackId="status" fill={STATUS_COLORS["Done"]} name="Done" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* At Risk */}
      {atRisk.length > 0 && (
        <div className="rounded-[8px] border border-border bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={16} strokeWidth={1.5} className="text-[#dc2626]" />
            <h3 className="text-[14px] font-[510] text-foreground">At Risk Projects</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
            {atRisk.map(({ project, reason }) => (
              <div key={project.id} className="rounded-[8px] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.05)] p-4">
                <p className="text-[13px] font-[510] text-foreground">{project.name}</p>
                <p className="mt-1 text-[12px] text-[#f87171]">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Progress Cards */}
      <ChartContainer title="Project Progress" description="Completion percentage per project">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
          {activeProjects?.map((p) => {
            const projectTasks = tasksByProject.get(p.id) ?? [];
            const done = projectTasks.filter((t) => t.status === "Done").length;
            const total = projectTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div key={p.id} className="rounded-[8px] border border-border-subtle bg-surface-card p-4 transition-colors duration-150 hover:bg-interactive-hover">
                <p className="text-[13px] font-[510] text-foreground">{p.name}</p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 rounded-full bg-interactive-active">
                    <div
                      className="h-1.5 rounded-full bg-success transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-foreground-tertiary">{pct}%</span>
                </div>
                <p className="mt-1.5 text-[12px] text-foreground-quaternary">
                  {done}/{total} tasks done{p.priority ? ` • ${p.priority} priority` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </ChartContainer>
    </div>
  );
}
