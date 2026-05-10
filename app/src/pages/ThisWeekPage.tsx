import { useMemo } from "react";
import { CalendarDays, Loader, AlertTriangle, CheckCircle, Ban } from "lucide-react";
import { format, addDays, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { useTasks } from "@/api/queries";
import { StatCard } from "@/components/cards/StatCard";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/Badge";
import {
  getTasksThisWeek,
  getCompletedThisWeek,
  getBlockedTasksSummary,
} from "@/lib/metrics";
import { isActiveTask, IMPORTANCE_COLORS, STATUS_COLORS } from "@/lib/constants";
import type { Task } from "@/api/types";

const IMPORTANCE_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function getDayLabel(dateStr: string, today: string, tomorrow: string): string {
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  return format(parseISO(dateStr), "EEE");
}

export function ThisWeekPage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

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

  const allWeekTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => t.assignedDate && t.assignedDate >= weekStartStr && t.assignedDate <= weekEndStr);
  }, [tasks, weekStartStr, weekEndStr]);

  const tasksByDay = useMemo(() => {
    const days: { date: string; label: string; tasks: Task[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = format(addDays(weekStart, i), "yyyy-MM-dd");
      const dayTasks = allWeekTasks
        .filter(t => t.assignedDate === date)
        .sort((a, b) => (IMPORTANCE_ORDER[a.importance ?? ""] ?? 2) - (IMPORTANCE_ORDER[b.importance ?? ""] ?? 2));
      days.push({
        date,
        label: `${getDayLabel(date, today, tomorrow)} — ${format(parseISO(date), "MMM d")}`,
        tasks: dayTasks,
      });
    }
    return days;
  }, [allWeekTasks, weekStart, today, tomorrow]);

  const upcomingDeadlines = useMemo(() => {
    if (!tasks) return [];
    const twoWeeksOut = format(addDays(new Date(), 14), "yyyy-MM-dd");
    return tasks
      .filter(t => isActiveTask(t) && t.deadline && t.deadline >= today && t.deadline <= twoWeeksOut)
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  }, [tasks, today]);

  if (isLoading) {
    return <LoadingState variant="page" />;
  }

  if (isError) {
    return <ErrorFallback message="Failed to load tasks" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">This Week</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 md:gap-4">
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
      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <h3 className="text-[14px] font-[510] text-foreground">Week Overview</h3>
        <p className="mt-0.5 text-[13px] text-foreground-tertiary">
          {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </p>

        <div className="mt-5 space-y-5">
          {tasksByDay.map(({ date, label, tasks: dayTasks }) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[12px] font-[510] text-foreground">{label}</span>
                <span className="text-[12px] text-foreground-quaternary">({dayTasks.length})</span>
              </div>
              {dayTasks.length === 0 ? (
                <div className="rounded-[6px] border border-border-subtle px-3 py-2">
                  <span className="text-[12px] text-foreground-quaternary">No tasks</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-[6px] border border-border-subtle bg-surface-card px-3 py-2.5 min-h-[44px] transition-colors duration-150 hover:bg-interactive-hover"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[task.status] }}
                        />
                        <span className="text-[13px] text-foreground">{task.name}</span>
                      </div>
                      <Badge variant="data" color={IMPORTANCE_COLORS[task.importance ?? ""]}>
                        {task.importance ?? "–"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <h3 className="text-[14px] font-[510] text-foreground">Upcoming Deadlines</h3>
        <p className="mt-0.5 text-[13px] text-foreground-tertiary">Tasks with deadlines in the next 14 days</p>

        {upcomingDeadlines.length === 0 ? (
          <EmptyState message="No upcoming deadlines" />
        ) : (
          <div className="mt-4 space-y-1">
            {upcomingDeadlines.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-[6px] border border-border-subtle bg-surface-card px-3 py-2 transition-colors duration-150 hover:bg-interactive-hover"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="data" color={IMPORTANCE_COLORS[task.importance ?? ""]}>
                    {task.importance ?? "–"}
                  </Badge>
                  <span className="text-[13px] text-foreground">{task.name}</span>
                </div>
                <span className="text-[12px] font-mono text-foreground-quaternary">
                  {format(parseISO(task.deadline!), "MMM d")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blocked Tasks */}
      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <h3 className="text-[14px] font-[510] text-foreground">Blocked Tasks</h3>
        <p className="mt-0.5 text-[13px] text-foreground-tertiary">Tasks waiting on unresolved dependencies</p>

        {!blocked || blocked.blockedTasks.length === 0 ? (
          <EmptyState message="No blocked tasks" />
        ) : (
          <div className="mt-4 space-y-1">
            {blocked.blockedTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-[6px] border border-border-subtle bg-surface-card px-3 py-2 transition-colors duration-150 hover:bg-interactive-hover"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="data" color={IMPORTANCE_COLORS[task.importance as keyof typeof IMPORTANCE_COLORS]}>
                    {task.importance}
                  </Badge>
                  <span className="text-[13px] text-foreground">{task.name}</span>
                </div>
                <span className="text-[12px] text-foreground-quaternary">
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
