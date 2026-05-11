import { useMemo, type MouseEvent } from "react";
import { AlertTriangle, Clock, Loader, Ban } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTasks, useProjects } from "@/api/queries";
import { StatCard } from "@/components/cards/StatCard";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { TaskDetailPopover, taskToSummary } from "@/components/shared/TaskDetailPopover";
import { NetworkDialog } from "@/components/network";
import { Badge } from "@/components/ui/Badge";
import { useTaskPopover } from "@/hooks/useTaskPopover";
import {
  getOverdueTasks,
  getDueSoonTasks,
  getBlockedByStatusTasks,
  getUpcomingDeadlinesTiered,
  getPrerequisiteWaitingTasks,
  type DeadlineTier,
} from "@/lib/metrics";
import { IMPORTANCE_COLORS } from "@/lib/constants";

const TIER_STYLES: Record<DeadlineTier, string> = {
  overdue: "border-l-2 border-l-[#dc2626] bg-[#dc2626]/5",
  critical: "border-l-2 border-l-[#d97706] bg-[#d97706]/5",
  upcoming: "border border-border-subtle",
};

const TIER_LABELS: Record<DeadlineTier, string> = {
  overdue: "Overdue",
  critical: "Due within 3 days",
  upcoming: "Due within 14 days",
};

export function DashboardPage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const { data: projects } = useProjects();
  const popover = useTaskPopover();

  const overdue = useMemo(() => (tasks ? getOverdueTasks(tasks) : []), [tasks]);
  const dueSoon = useMemo(() => (tasks ? getDueSoonTasks(tasks, 7) : []), [tasks]);
  const inProgress = useMemo(
    () => (tasks ? tasks.filter(t => t.status === "In Progress") : []),
    [tasks]
  );
  const blocked = useMemo(() => (tasks ? getBlockedByStatusTasks(tasks) : []), [tasks]);
  const deadlinesTiered = useMemo(() => (tasks ? getUpcomingDeadlinesTiered(tasks) : []), [tasks]);
  const prerequisiteWaiting = useMemo(() => (tasks ? getPrerequisiteWaitingTasks(tasks) : []), [tasks]);

  function handleTaskClick(taskId: string, e: MouseEvent<HTMLButtonElement>) {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) return;
    const rect = e.currentTarget.getBoundingClientRect();
    popover.open(taskToSummary(task, projects ?? []), rect);
  }

  if (isLoading) return <LoadingState variant="page" />;
  if (isError) return <ErrorFallback message="Failed to load tasks" onRetry={() => refetch()} />;

  const tiers: DeadlineTier[] = ["overdue", "critical", "upcoming"];

  return (
    <div className="space-y-6 md:space-y-8">
      <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">Dashboard</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard title="Overdue" value={overdue.length} icon={AlertTriangle} accent={overdue.length > 0 ? "red" : "default"} />
        <StatCard title="Due Soon" value={dueSoon.length} icon={Clock} accent={dueSoon.length > 0 ? "orange" : "default"} />
        <StatCard title="In Progress" value={inProgress.length} icon={Loader} />
        <StatCard title="Blocked" value={blocked.length} icon={Ban} accent={blocked.length > 0 ? "red" : "default"} />
      </div>

      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <h3 className="text-[14px] font-[510] text-foreground">Upcoming Deadlines</h3>
        <p className="mt-0.5 text-[13px] text-foreground-tertiary">Tasks with deadlines in the next 14 days, including overdue</p>

        {deadlinesTiered.length === 0 ? (
          <EmptyState message="No upcoming deadlines" />
        ) : (
          <div className="mt-4 space-y-4">
            {tiers.map(tier => {
              const tierTasks = deadlinesTiered.filter(t => t.tier === tier);
              if (tierTasks.length === 0) return null;
              return (
                <div key={tier}>
                  <span className="text-[11px] font-[510] uppercase tracking-wide text-foreground-quaternary">
                    {TIER_LABELS[tier]}
                  </span>
                  <div className="mt-2 space-y-1">
                    {tierTasks.map(task => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={(e) => handleTaskClick(task.id, e)}
                        className={`flex w-full items-center justify-between rounded-[6px] px-3 py-2.5 min-h-[44px] transition-colors duration-150 hover:bg-interactive-hover text-left ${TIER_STYLES[tier]}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="data" color={IMPORTANCE_COLORS[task.importance ?? ""]}>
                            {task.importance ?? "–"}
                          </Badge>
                          <span className="text-[13px] text-foreground">{task.name}</span>
                        </div>
                        <span className="text-[12px] font-mono text-foreground-quaternary">
                          {format(parseISO(task.deadline), "MMM d")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
        <div className="rounded-[8px] border border-border bg-surface-card p-5">
          <h3 className="text-[14px] font-[510] text-foreground">Blocked Tasks</h3>
          <p className="mt-0.5 text-[13px] text-foreground-tertiary">Tasks with status set to Blocked</p>

          {blocked.length === 0 ? (
            <EmptyState message="No blocked tasks" />
          ) : (
            <div className="mt-4 space-y-1">
              {blocked.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={(e) => handleTaskClick(task.id, e)}
                  className="flex w-full items-center gap-3 rounded-[6px] border border-border-subtle px-3 py-2.5 min-h-[44px] transition-colors duration-150 hover:bg-interactive-hover text-left"
                >
                  <Badge variant="data" color={IMPORTANCE_COLORS[task.importance ?? ""]}>
                    {task.importance ?? "–"}
                  </Badge>
                  <span className="text-[13px] text-foreground">{task.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[8px] border border-border bg-surface-card p-5">
          <h3 className="text-[14px] font-[510] text-foreground">Waiting on Prerequisites</h3>
          <p className="mt-0.5 text-[13px] text-foreground-tertiary">Tasks with dependencies that haven't started yet</p>

          {prerequisiteWaiting.length === 0 ? (
            <EmptyState message="No tasks waiting on prerequisites" />
          ) : (
            <div className="mt-4 space-y-1">
              {prerequisiteWaiting.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={(e) => handleTaskClick(task.id, e)}
                  className="flex w-full items-center justify-between rounded-[6px] border border-border-subtle px-3 py-2.5 min-h-[44px] transition-colors duration-150 hover:bg-interactive-hover text-left"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="data" color={IMPORTANCE_COLORS[task.importance ?? ""]}>
                      {task.importance ?? "–"}
                    </Badge>
                    <span className="text-[13px] text-foreground">{task.name}</span>
                  </div>
                  <span className="text-[12px] text-foreground-quaternary truncate max-w-[140px]">
                    {task.notStartedPrereqs.slice(0, 3).map(p => p.name).join(", ")}
                    {task.notStartedPrereqs.length > 3 ? ` +${task.notStartedPrereqs.length - 3} more` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {popover.selectedTask && popover.anchorRect && (
        <TaskDetailPopover
          task={popover.selectedTask}
          anchorRect={popover.anchorRect}
          onClose={popover.close}
          onViewNetwork={popover.openNetwork}
        />
      )}

      <NetworkDialog
        taskId={popover.networkTaskId}
        taskName={popover.networkTaskName}
        onClose={popover.closeNetwork}
      />
    </div>
  );
}
