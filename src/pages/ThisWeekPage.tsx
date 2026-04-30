import { useMemo } from "react";
import { CalendarDays, Loader, AlertTriangle, CheckCircle, Ban } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { useTasks } from "@/api/queries";
import { StatCard } from "@/components/cards/StatCard";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  getTasksThisWeek,
  getCompletedThisWeek,
  getBlockedTasksSummary,
} from "@/lib/metrics";
import { isActiveTask, PRIORITY_COLORS, STATUS_COLORS } from "@/lib/constants";
import type { Task } from "@/api/types";

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function getDayLabel(dateStr: string, today: string, tomorrow: string): string {
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  return format(parseISO(dateStr), "EEE");
}

export function ThisWeekPage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const weekTasks = useMemo(() => (tasks ? getTasksThisWeek(tasks) : []), [tasks]);
  const completedThisWeek = useMemo(() => (tasks ? getCompletedThisWeek(tasks) : []), [tasks]);
  const blocked = useMemo(() => (tasks ? getBlockedTasksSummary(tasks) : null), [tasks]);

  const inProgress = useMemo(
    () => weekTasks.filter(t => t.status === "In Progress"),
    [weekTasks]
  );

  const overdue = useMemo(
    () => (tasks ? tasks.filter(t => isActiveTask(t) && t.deadline && t.deadline < today) : []),
    [tasks, today]
  );

  // Group all week tasks (active + completed) by day
  const allWeekTasks = useMemo(() => {
    if (!tasks) return [];
    const endDate = format(addDays(new Date(), 6), "yyyy-MM-dd");
    return tasks.filter(t => t.assignedDate && t.assignedDate >= today && t.assignedDate <= endDate);
  }, [tasks, today]);

  const tasksByDay = useMemo(() => {
    const days: { date: string; label: string; tasks: Task[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = format(addDays(new Date(), i), "yyyy-MM-dd");
      const dayTasks = allWeekTasks
        .filter(t => t.assignedDate === date)
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
      days.push({
        date,
        label: `${getDayLabel(date, today, tomorrow)} — ${format(parseISO(date), "MMM d")}`,
        tasks: dayTasks,
      });
    }
    return days;
  }, [allWeekTasks, today, tomorrow]);

  const upcomingDeadlines = useMemo(() => {
    if (!tasks) return [];
    const twoWeeksOut = format(addDays(new Date(), 14), "yyyy-MM-dd");
    return tasks
      .filter(t => isActiveTask(t) && t.deadline && t.deadline >= today && t.deadline <= twoWeeksOut)
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  }, [tasks, today]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (isError) {
    return <ErrorFallback message="Failed to load tasks" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">This Week</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Tasks This Week" value={weekTasks.length + completedThisWeek.length} icon={CalendarDays} />
        <StatCard title="In Progress" value={inProgress.length} icon={Loader} />
        <StatCard
          title="Overdue"
          value={overdue.length}
          icon={AlertTriangle}
          accent={overdue.length > 0 ? "red" : "default"}
        />
        <StatCard title="Completed" value={completedThisWeek.length} icon={CheckCircle} accent="green" />
        <StatCard
          title="Blocked"
          value={blocked?.blockedCount ?? 0}
          icon={Ban}
          accent={blocked && blocked.blockedCount > 0 ? "red" : "default"}
        />
      </div>

      {/* Week Tasks by Day */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground">Week Overview</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {format(new Date(), "MMM d")} — {format(addDays(new Date(), 6), "MMM d, yyyy")}
        </p>

        <div className="mt-4 space-y-5">
          {tasksByDay.map(({ date, label, tasks: dayTasks }) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">({dayTasks.length})</span>
              </div>
              {dayTasks.length === 0 ? (
                <div className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
                  <span className="text-xs text-muted-foreground">No tasks</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[task.status] }}
                        />
                        <span className="text-sm text-foreground">{task.name}</span>
                      </div>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground">Upcoming Deadlines</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Tasks with deadlines in the next 14 days</p>

        {upcomingDeadlines.length === 0 ? (
          <EmptyState message="No upcoming deadlines" />
        ) : (
          <div className="mt-4 space-y-1">
            {upcomingDeadlines.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                  >
                    {task.priority}
                  </span>
                  <span className="text-sm text-foreground">{task.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(task.deadline!), "MMM d")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blocked Tasks */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground">Blocked Tasks</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Tasks waiting on unresolved dependencies</p>

        {!blocked || blocked.blockedTasks.length === 0 ? (
          <EmptyState message="No blocked tasks" />
        ) : (
          <div className="mt-4 space-y-1">
            {blocked.blockedTasks.map(task => (
              <div
                key={task.name}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] }}
                  >
                    {task.priority}
                  </span>
                  <span className="text-sm text-foreground">{task.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  blocked by {task.blockedByCount} task{task.blockedByCount > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
