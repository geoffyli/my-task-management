import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useTasks, useProjects } from "@/api/queries";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { getProjectHealth, buildTasksByProjectIndex } from "@/lib/metrics";
import { STATUS_COLORS, TOOLTIP_STYLE } from "@/lib/constants";
import { parseISO, differenceInDays, format } from "date-fns";

export function ProjectsPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const tasksByProject = useMemo(
    () => (tasks ? buildTasksByProjectIndex(tasks) : new Map()),
    [tasks]
  );

  const health = useMemo(
    () => (tasks && projects ? getProjectHealth(tasks, projects) : []),
    [tasks, projects]
  );

  const timeline = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter((p) => p.startDate)
      .map((p) => ({
        name: p.name,
        start: p.startDate!,
        end: p.endDate ?? new Date().toISOString().slice(0, 10),
        duration: differenceInDays(
          parseISO(p.endDate ?? new Date().toISOString().slice(0, 10)),
          parseISO(p.startDate!)
        ),
        status: p.status,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [projects]);

  if (tasksLoading || projectsLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Projects</h2>

      <ChartContainer title="Project Health" description="Task status distribution per project">
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
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Project Timeline" description="Duration of projects with start dates">
        <div className="space-y-3">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects with date ranges found</p>
          ) : (
            timeline.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-48 truncate text-xs text-foreground">{p.name}</span>
                <div className="flex-1">
                  <div className="relative h-5 rounded-full bg-muted">
                    <div
                      className="absolute h-5 rounded-full"
                      style={{
                        backgroundColor: p.status === "Completed" ? STATUS_COLORS.Done : STATUS_COLORS["In Progress"],
                        width: `${Math.min((p.duration / 200) * 100, 100)}%`,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
                <span className="w-36 text-right text-xs text-muted-foreground">
                  {format(parseISO(p.start), "MMM dd")} – {format(parseISO(p.end), "MMM dd")}
                </span>
              </div>
            ))
          )}
        </div>
      </ChartContainer>

      <ChartContainer title="Active Projects Summary" description="Current status of all projects">
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
