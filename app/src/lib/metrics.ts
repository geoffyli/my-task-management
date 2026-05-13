import { differenceInDays, parseISO, format, eachWeekOfInterval, subDays, addDays, startOfWeek, endOfWeek } from "date-fns";
import type { Task, Project } from "@/api/types";
import type { TimeRange } from "@/lib/constants";
import { isActiveTask } from "@/lib/constants";
import { getTimeRangeStart } from "./date-utils";

export interface OverviewStats {
  active: number;
  overdue: number;
  completedWeek: number;
  completedPrevWeek: number;
  avgAge: number;
}

export function getOverviewStats(tasks: Task[]): OverviewStats {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const oneWeekAgo = subDays(today, 7);
  const twoWeeksAgo = subDays(today, 14);

  let active = 0, overdue = 0, completedWeek = 0, completedPrevWeek = 0, totalAge = 0;

  for (const t of tasks) {
    if (isActiveTask(t)) {
      active++;
      totalAge += differenceInDays(today, parseISO(t.createdTime));
      if (t.deadline && t.deadline < todayStr) overdue++;
    }
    if (t.status === "Done" && (t.closedDate || t.assignedDate)) {
      const doneDate = parseISO(t.closedDate ?? t.assignedDate!);
      if (doneDate >= oneWeekAgo) completedWeek++;
      else if (doneDate >= twoWeeksAgo) completedPrevWeek++;
    }
  }

  return { active, overdue, completedWeek, completedPrevWeek, avgAge: active > 0 ? Math.round(totalAge / active) : 0 };
}

export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter(isActiveTask);
}

export function getStatusCounts(tasks: Task[]): { status: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

export function getImportanceCounts(activeTasks: Task[]): { importance: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const t of activeTasks) {
    const key = t.importance ?? "Unset";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts).map(([importance, count]) => ({ importance, count }));
}

export interface ThroughputEntry {
  week: string;
  created: number;
  completed: number;
}

export function getThroughputData(tasks: Task[], range: TimeRange): ThroughputEntry[] {
  const rangeStart = getTimeRangeStart(range);
  const start = rangeStart ?? parseISO(tasks[0]?.createdTime ?? new Date().toISOString());
  const end = new Date();

  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  if (weeks.length === 0) return [];

  const firstWeekTs = weeks[0]!.getTime();
  const msPerWeek = 7 * 86400000;
  const createdByWeek = new Array<number>(weeks.length).fill(0);
  const completedByWeek = new Array<number>(weeks.length).fill(0);

  for (const t of tasks) {
    const createdTs = parseISO(t.createdTime).getTime();
    const weekIdx = Math.floor((createdTs - firstWeekTs) / msPerWeek);
    if (weekIdx >= 0 && weekIdx < weeks.length) {
      createdByWeek[weekIdx]!++;
    }

    if (t.status === "Done" && (t.closedDate || t.assignedDate)) {
      const doneTs = parseISO(t.closedDate ?? t.assignedDate!).getTime();
      const doneWeekIdx = Math.floor((doneTs - firstWeekTs) / msPerWeek);
      if (doneWeekIdx >= 0 && doneWeekIdx < weeks.length) {
        completedByWeek[doneWeekIdx]!++;
      }
    }
  }

  return weeks.map((weekStart, i) => ({
    week: format(weekStart, "MMM dd"),
    created: createdByWeek[i]!,
    completed: completedByWeek[i]!,
  }));
}

export interface BurndownEntry {
  week: string;
  open: number;
}

export function getBurndownData(tasks: Task[], range: TimeRange): BurndownEntry[] {
  const rangeStart = getTimeRangeStart(range);
  const start = rangeStart ?? parseISO(tasks[0]?.createdTime ?? new Date().toISOString());
  const end = new Date();

  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

  return weeks.map((weekStart) => {
    const wsTime = weekStart.getTime();
    const open = tasks.filter((t) => {
      const created = parseISO(t.createdTime).getTime();
      if (created > wsTime) return false;
      if (t.status === "Done" || t.status === "Cancelled") {
        const closedStr = t.closedDate ?? (t.status === "Done" ? t.assignedDate : t.lastEditedTime);
        if (!closedStr) return true;
        const closed = parseISO(closedStr).getTime();
        return closed > wsTime;
      }
      return true;
    }).length;

    return { week: format(weekStart, "MMM dd"), open };
  });
}

export interface AgingBucket {
  bucket: string;
  high: number;
  medium: number;
  low: number;
}

export function getAgingDistribution(activeTasks: Task[]): AgingBucket[] {
  const now = new Date();
  const buckets = [
    { label: "0-7d", min: 0, max: 7 },
    { label: "7-14d", min: 7, max: 14 },
    { label: "14-30d", min: 14, max: 30 },
    { label: "30-60d", min: 30, max: 60 },
    { label: "60-90d", min: 60, max: 90 },
    { label: "90d+", min: 90, max: Infinity },
  ];

  return buckets.map(({ label, min, max }) => {
    const inBucket = activeTasks.filter((t) => {
      const age = differenceInDays(now, parseISO(t.createdTime));
      return age >= min && age < max;
    });
    return {
      bucket: label,
      high: inBucket.filter((t) => t.importance === "High").length,
      medium: inBucket.filter((t) => t.importance === "Medium").length,
      low: inBucket.filter((t) => t.importance === "Low").length,
    };
  });
}

export interface VelocityEntry {
  week: string;
  completed: number;
  average: number;
}

export function getVelocityData(tasks: Task[], range: TimeRange): VelocityEntry[] {
  const throughput = getThroughputData(tasks, range);
  return throughput.map((entry, i, arr) => {
    const windowStart = Math.max(0, i - 3);
    const window = arr.slice(windowStart, i + 1);
    const avg = window.reduce((sum, e) => sum + e.completed, 0) / window.length;
    return { week: entry.week, completed: entry.completed, average: Math.round(avg * 10) / 10 };
  });
}

export interface ProjectHealthEntry {
  project: string;
  notStarted: number;
  inProgress: number;
  done: number;
  blocked: number;
  cancelled: number;
}

export function getProjectHealth(tasks: Task[], projects: Project[]): ProjectHealthEntry[] {
  const tasksByProject = buildTasksByProjectIndex(tasks);
  return projects.map((p) => {
    const projectTasks = tasksByProject.get(p.id) ?? [];
    const counts = { notStarted: 0, inProgress: 0, done: 0, blocked: 0, cancelled: 0 };
    for (const t of projectTasks) {
      switch (t.status) {
        case "Not Started": counts.notStarted++; break;
        case "In Progress": counts.inProgress++; break;
        case "Done": counts.done++; break;
        case "Blocked": counts.blocked++; break;
        case "Cancelled": counts.cancelled++; break;
      }
    }
    return { project: p.name, ...counts };
  }).filter((p) => p.notStarted + p.inProgress + p.done + p.blocked + p.cancelled > 0);
}

export function buildTasksByProjectIndex(tasks: Task[]): Map<string, Task[]> {
  const index = new Map<string, Task[]>();
  for (const t of tasks) {
    for (const pid of t.projectIds) {
      const list = index.get(pid);
      if (list) list.push(t);
      else index.set(pid, [t]);
    }
  }
  return index;
}

export interface CalendarDayEntry {
  date: string;
  count: number;
}

export function getCalendarHeatmapData(tasks: Task[], range?: TimeRange): CalendarDayEntry[] {
  const rangeStart = range ? getTimeRangeStart(range) : null;
  const dayCounts: Record<string, number> = {};

  for (const t of tasks) {
    const createdDate = t.createdTime.slice(0, 10);
    if (!rangeStart || parseISO(createdDate) >= rangeStart) {
      dayCounts[createdDate] = (dayCounts[createdDate] ?? 0) + 1;
    }

    if (t.status === "Done" && (t.closedDate || t.assignedDate)) {
      const completed = (t.closedDate ?? t.assignedDate!).slice(0, 10);
      if (!rangeStart || parseISO(completed) >= rangeStart) {
        dayCounts[completed] = (dayCounts[completed] ?? 0) + 1;
      }
    }
  }

  return Object.entries(dayCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface DeadlineEntry {
  name: string;
  deadline: string;
  daysRemaining: number;
  importance: string | null;
}

export function getDeadlineProximity(tasks: Task[]): DeadlineEntry[] {
  const today = new Date();
  return tasks
    .filter((t) => t.deadline && isActiveTask(t))
    .map((t) => ({
      name: t.name,
      deadline: t.deadline!,
      daysRemaining: differenceInDays(parseISO(t.deadline!), today),
      importance: t.importance,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export interface BlockedTasksSummary {
  blockedCount: number;
  blockedTasks: { id: string; name: string; blockedByCount: number; importance: string | null }[];
}

export function getBlockedTasksSummary(tasks: Task[]): BlockedTasksSummary {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const blockedTasks = tasks.filter((t) => {
    if (!isActiveTask(t)) return false;
    return t.dependencies.some((depId) => {
      const dep = taskMap.get(depId);
      return dep && isActiveTask(dep);
    });
  });

  return {
    blockedCount: blockedTasks.length,
    blockedTasks: blockedTasks
      .map((t) => ({
        id: t.id,
        name: t.name,
        blockedByCount: t.dependencies.filter((d) => {
          const dep = taskMap.get(d);
          return dep && isActiveTask(dep);
        }).length,
        importance: t.importance,
      }))
      .sort((a, b) => b.blockedByCount - a.blockedByCount)
      .slice(0, 10),
  };
}

export function getTasksThisWeek(tasks: Task[]): Task[] {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  return tasks.filter(t => t.assignedDate && t.assignedDate >= weekStart && t.assignedDate <= weekEnd && t.status !== "Done" && t.status !== "Cancelled");
}

export function getCompletedThisWeek(tasks: Task[]): Task[] {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  return tasks.filter(t => {
    if (t.status !== "Done") return false;
    const d = t.closedDate ?? t.assignedDate;
    return d != null && d >= weekStart && d <= weekEnd;
  });
}

export function getAtRiskProjects(tasks: Task[], projects: Project[]): { project: Project; reason: string }[] {
  const tasksByProject = buildTasksByProjectIndex(tasks);
  const results: { project: Project; reason: string }[] = [];
  const todayStr = format(new Date(), "yyyy-MM-dd");

  for (const project of projects) {
    if (project.status === "Archived") continue;
    const projectTasks = tasksByProject.get(project.id) || [];
    const activeTasks = projectTasks.filter(t => t.status !== "Done" && t.status !== "Cancelled");

    if (activeTasks.length === 0) continue;

    const overdue = activeTasks.filter(t => t.deadline && t.deadline < todayStr);
    if (overdue.length > activeTasks.length * 0.5) {
      results.push({ project, reason: `${overdue.length}/${activeTasks.length} tasks overdue` });
      continue;
    }

    // Check for staleness (no recent activity)
    const lastEdit = projectTasks.reduce((latest, t) => {
      return t.lastEditedTime > latest ? t.lastEditedTime : latest;
    }, "");
    if (lastEdit && differenceInDays(new Date(), new Date(lastEdit)) > 7) {
      const staleDays = differenceInDays(new Date(), new Date(lastEdit));
      results.push({ project, reason: `No activity for ${staleDays} days` });
    }
  }
  return results;
}

// --- Dashboard metric functions ---

export function getOverdueTasks(tasks: Task[]): Task[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  return tasks.filter(t => isActiveTask(t) && t.deadline != null && t.deadline < todayStr);
}

export function getDueSoonTasks(tasks: Task[], days = 7): Task[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const cutoff = format(addDays(new Date(), days), "yyyy-MM-dd");
  return tasks.filter(t =>
    isActiveTask(t) && t.deadline != null && t.deadline >= todayStr && t.deadline <= cutoff
  );
}

export function getBlockedByStatusTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.status === "Blocked");
}

export type DeadlineTier = "overdue" | "critical" | "upcoming";

export interface TieredDeadlineTask {
  id: string;
  name: string;
  importance: Task["importance"];
  deadline: string;
  tier: DeadlineTier;
}

export function getUpcomingDeadlinesTiered(tasks: Task[]): TieredDeadlineTask[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const threeDays = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const fourteenDays = format(addDays(new Date(), 14), "yyyy-MM-dd");

  return tasks
    .filter(t => isActiveTask(t) && t.deadline != null && t.deadline <= fourteenDays)
    .map(t => {
      let tier: DeadlineTier;
      if (t.deadline! < todayStr) tier = "overdue";
      else if (t.deadline! <= threeDays) tier = "critical";
      else tier = "upcoming";
      return { id: t.id, name: t.name, importance: t.importance, deadline: t.deadline!, tier };
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export interface PrerequisiteWaitingTask {
  id: string;
  name: string;
  importance: Task["importance"];
  notStartedPrereqs: { id: string; name: string }[];
}

export function getPrerequisiteWaitingTasks(tasks: Task[]): PrerequisiteWaitingTask[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const results: PrerequisiteWaitingTask[] = [];

  for (const t of tasks) {
    if (!isActiveTask(t) || t.status === "Blocked" || t.dependencies.length === 0) continue;
    const notStartedPrereqs = t.dependencies
      .map(depId => taskMap.get(depId))
      .filter((dep): dep is Task => dep != null && dep.status === "Not Started")
      .map(dep => ({ id: dep.id, name: dep.name }));

    if (notStartedPrereqs.length > 0) {
      results.push({ id: t.id, name: t.name, importance: t.importance, notStartedPrereqs });
    }
  }

  return results;
}
