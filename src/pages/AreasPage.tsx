import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useTasks, useProjects, useAreas } from "@/api/queries";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { STATUS_COLORS, AREA_COLORS, PRIORITY_COLORS, TOOLTIP_STYLE, isActiveTask, getAreaColor } from "@/lib/constants";
import type { Task } from "@/api/types";

export function AreasPage() {
  const { data: tasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const { data: projects, isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
  const { data: areas, isLoading: areasLoading, isError: areasError, refetch: refetchAreas } = useAreas();

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
        area: area.name.length > 20 ? area.name.slice(0, 18) + "…" : area.name,
        fullName: area.name,
        notStarted: areaTasks.filter((t) => t.status === "Not Started").length,
        inProgress: areaTasks.filter((t) => t.status === "In Progress").length,
        done: areaTasks.filter((t) => t.status === "Done").length,
        total: areaTasks.length,
      };
    }).filter((a) => a.total > 0);
  }, [areas, areaTasksMap]);

  const priorityMatrix = useMemo(() => {
    if (!areas) return [];
    return areas.map((area) => {
      const activeTasks = (areaTasksMap.get(area.id) ?? []).filter(isActiveTask);
      return {
        area: area.name,
        high: activeTasks.filter((t) => t.priority === "High").length,
        medium: activeTasks.filter((t) => t.priority === "Medium").length,
        low: activeTasks.filter((t) => t.priority === "Low").length,
      };
    }).filter((a) => a.high + a.medium + a.low > 0);
  }, [areas, areaTasksMap]);

  if (tasksLoading || projectsLoading || areasLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (tasksError || projectsError || areasError) {
    return <ErrorFallback message="Failed to load area data" onRetry={() => { refetchTasks(); refetchProjects(); refetchAreas(); }} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Areas</h2>

      <ChartContainer title="Area Workload" description="Task status distribution across areas">
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
      </ChartContainer>

      <ChartContainer title="Area-Priority Matrix" description="Active tasks by area and priority level">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left text-xs font-medium text-muted-foreground">Area</th>
                <th className="py-2 text-center text-xs font-medium text-red-400">High</th>
                <th className="py-2 text-center text-xs font-medium text-yellow-400">Medium</th>
                <th className="py-2 text-center text-xs font-medium text-gray-400">Low</th>
              </tr>
            </thead>
            <tbody>
              {priorityMatrix.map((row) => (
                <tr key={row.area} className="border-b border-border/50">
                  <td className="py-2 text-xs text-foreground">{row.area}</td>
                  <td className="py-2 text-center">
                    <HeatCell count={row.high} color={PRIORITY_COLORS.High} />
                  </td>
                  <td className="py-2 text-center">
                    <HeatCell count={row.medium} color={PRIORITY_COLORS.Medium} />
                  </td>
                  <td className="py-2 text-center">
                    <HeatCell count={row.low} color={PRIORITY_COLORS.Low} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      <ChartContainer title="Area Overview" description="Projects and task counts per area">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {areas?.map((area) => {
            const areaTasks = areaTasksMap.get(area.id) ?? [];
            const activeTasks = areaTasks.filter(isActiveTask);
            const areaProjects = projects?.filter((p) => p.areaIds.includes(area.id)) ?? [];

            return (
              <div key={area.id} className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getAreaColor(area.name) }}
                  />
                  <p className="text-sm font-medium text-foreground">{area.name}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {areaProjects.length} projects • {activeTasks.length} active tasks • {areaTasks.length} total
                </p>
              </div>
            );
          })}
        </div>
      </ChartContainer>
    </div>
  );
}

function HeatCell({ count, color }: { count: number; color: string }) {
  if (count === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
      style={{ backgroundColor: color, opacity: Math.min(0.4 + count * 0.2, 1) }}
    >
      {count}
    </span>
  );
}
