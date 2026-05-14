import { useMemo, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Ban, Loader, TrendingUp, Activity } from "lucide-react";
import { differenceInDays } from "date-fns";
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
  getBlockedByStatusTasks,
  getPrerequisiteWaitingTasks,
  getAtRiskProjects,
  getDriftTasks,
  getNetFlow,
} from "@/lib/metrics";
import { computeHealthReport, computeHealthScore } from "@/lib/health";
import { IMPORTANCE_COLORS } from "@/lib/constants";

export function DashboardPage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const { data: projects } = useProjects();
  const popover = useTaskPopover();

  const inProgress = useMemo(() => {
    if (!tasks || !projects) return [];
    const now = new Date();
    return tasks
      .filter(t => t.status === "In Progress")
      .map(t => {
        const projectNames = t.projectIds
          .map(pid => projects.find(p => p.id === pid)?.name)
          .filter(Boolean) as string[];
        const daysInProgress = t.startedDate
          ? differenceInDays(now, new Date(t.startedDate))
          : null;
        return { ...t, projectNames, daysInProgress };
      });
  }, [tasks, projects]);

  const blocked = useMemo(() => (tasks ? getBlockedByStatusTasks(tasks) : []), [tasks]);
  const prerequisiteWaiting = useMemo(() => (tasks ? getPrerequisiteWaitingTasks(tasks) : []), [tasks]);
  const netFlow = useMemo(() => (tasks ? getNetFlow(tasks) : { completed: 0, created: 0, net: 0 }), [tasks]);
  const driftTasks = useMemo(() => (tasks ? getDriftTasks(tasks) : []), [tasks]);
  const atRiskProjects = useMemo(
    () => (tasks && projects ? getAtRiskProjects(tasks, projects) : []),
    [tasks, projects]
  );
  const healthData = useMemo(() => {
    if (!tasks || !projects) return { score: 100, topViolation: null };
    const report = computeHealthReport(tasks, projects, null);
    const score = computeHealthScore(report);
    const topViolation = report.results[0]
      ? { rule: report.results[0].rule.name, count: report.results[0].violations.length }
      : null;
    return { score, topViolation };
  }, [tasks, projects]);

  function handleTaskClick(taskId: string, e: MouseEvent<HTMLButtonElement>) {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) return;
    const rect = e.currentTarget.getBoundingClientRect();
    popover.open(taskToSummary(task, projects ?? []), rect);
  }

  if (isLoading) return <LoadingState variant="page" />;
  if (isError) return <ErrorFallback message="Failed to load tasks" onRetry={() => refetch()} />;

  const netFlowDisplay = netFlow.net > 0 ? `+${netFlow.net}` : `${netFlow.net}`;
  const netFlowAccent = netFlow.net > 0 ? "green" : netFlow.net < 0 ? "red" : "default";
  const healthAccent = healthData.score >= 75 ? "green" : healthData.score >= 50 ? "orange" : "red";

  return (
    <div className="space-y-6 md:space-y-8">
      <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">Dashboard</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard title="In Progress" value={inProgress.length} icon={Loader} />
        <StatCard title="Blocked" value={blocked.length} icon={Ban} accent={blocked.length > 0 ? "red" : "default"} />
        <StatCard title="Net Flow" value={netFlowDisplay} icon={TrendingUp} accent={netFlowAccent} />
        <StatCard title="Health" value={healthData.score} icon={Activity} accent={healthAccent} />
      </div>


      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-[510] text-foreground">In Progress</h3>
            <p className="mt-0.5 text-[13px] text-foreground-tertiary">Your active work</p>
          </div>
        </div>

        {inProgress.length === 0 ? (
          <EmptyState message="No tasks in progress" />
        ) : (
          <div className="mt-4 space-y-1">
            {inProgress.map(task => (
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
                  {task.projectNames.length > 0 && (
                    <span className="text-[12px] text-foreground-quaternary truncate max-w-[120px]">
                      {task.projectNames[0]}
                    </span>
                  )}
                </div>
                {task.daysInProgress != null && (
                  <span className="text-[12px] font-mono text-foreground-quaternary">
                    {task.daysInProgress}d
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>


      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-[510] text-foreground">Drift Alerts</h3>
            <p className="mt-0.5 text-[13px] text-foreground-tertiary">High-priority tasks stalling 21+ days</p>
          </div>
          <Link to="/prioritize" className="text-[12px] text-accent hover:underline">
            Prioritize →
          </Link>
        </div>

        {driftTasks.length === 0 ? (
          <EmptyState message="No drifting tasks" />
        ) : (
          <div className="mt-4 space-y-1">
            {driftTasks.map(task => (
              <button
                key={task.id}
                type="button"
                onClick={(e) => handleTaskClick(task.id, e)}
                className="flex w-full items-center justify-between rounded-[6px] border-l-2 border-l-[#d97706] bg-[#d97706]/5 px-3 py-2.5 min-h-[44px] transition-colors duration-150 hover:bg-interactive-hover text-left"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={14} className="text-[#d97706]" />
                  <span className="text-[13px] text-foreground">{task.name}</span>
                </div>
                <span className="text-[12px] font-mono text-foreground-quaternary">
                  {task.daysSinceCreated}d
                </span>
              </button>
            ))}
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


      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-[510] text-foreground">At-Risk Projects</h3>
            <p className="mt-0.5 text-[13px] text-foreground-tertiary">Projects with overdue tasks or stale activity</p>
          </div>
          <Link to="/projects" className="text-[12px] text-accent hover:underline">
            All projects →
          </Link>
        </div>

        {atRiskProjects.length === 0 ? (
          <EmptyState message="No at-risk projects" />
        ) : (
          <div className="mt-4 space-y-1">
            {atRiskProjects.map(({ project, reason }) => (
              <div
                key={project.id}
                className="flex w-full items-center justify-between rounded-[6px] border border-border-subtle px-3 py-2.5 min-h-[44px]"
              >
                <span className="text-[13px] text-foreground">{project.name}</span>
                <span className="text-[12px] text-[#d97706]">{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="rounded-[8px] border border-border bg-surface-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-[510] text-foreground">Data Health</h3>
            <p className="mt-0.5 text-[13px] text-foreground-tertiary">Task data quality score</p>
          </div>
          <Link to="/health" className="text-[12px] text-accent hover:underline">
            View details →
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="text-[28px] font-[590] text-foreground">{healthData.score}</span>
          <span className="text-[13px] text-foreground-quaternary">/ 100</span>
          {healthData.topViolation && (
            <span className="text-[12px] text-foreground-tertiary ml-auto">
              Top issue: {healthData.topViolation.rule} ({healthData.topViolation.count} items)
            </span>
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
