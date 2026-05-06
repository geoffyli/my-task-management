import { differenceInDays, parseISO, format, eachWeekOfInterval, subDays, addDays } from "date-fns";
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
  const todayStr = today.toISOString().slice(0, 10);
  const oneWeekAgo = subDays(today, 7);
  const twoWeeksAgo = subDays(today, 14);

  let active = 0, overdue = 0, completedWeek = 0, completedPrevWeek = 0, totalAge = 0;

  for (const t of tasks) {
    if (isActiveTask(t)) {
      active++;
      totalAge += differenceInDays(today, parseISO(t.createdTime));
      if (t.deadline && t.deadline < todayStr) overdue++;
    }
    if (t.status === "Done" && t.assignedDate) {
      const doneDate = parseISO(t.assignedDate);
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
    counts[t.importance] = (counts[t.importance] ?? 0) + 1;
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

    if (t.status === "Done" && t.assignedDate) {
      const doneTs = parseISO(t.assignedDate).getTime();
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
        const closedStr = t.status === "Done" ? t.assignedDate : t.lastEditedTime;
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

export interface RescheduleEntry {
  bucket: string;
  count: number;
}

export function getRescheduleDistribution(tasks: Task[]): RescheduleEntry[] {
  const slips = tasks
    .filter((t) => t.assignedDate && t.initialAssignedDate && t.assignedDate !== t.initialAssignedDate)
    .map((t) => differenceInDays(parseISO(t.assignedDate!), parseISO(t.initialAssignedDate!)))
    .filter((d) => d > 0);

  const buckets = [
    { label: "1-3 days", min: 1, max: 4 },
    { label: "4-7 days", min: 4, max: 8 },
    { label: "1-2 weeks", min: 8, max: 15 },
    { label: "2+ weeks", min: 15, max: Infinity },
  ];

  return buckets.map(({ label, min, max }) => ({
    bucket: label,
    count: slips.filter((d) => d >= min && d < max).length,
  }));
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

    if (t.status === "Done" && t.assignedDate) {
      const completed = t.assignedDate.slice(0, 10);
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
  importance: string;
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
  blockedTasks: { name: string; blockedByCount: number; importance: string }[];
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
  const today = format(new Date(), "yyyy-MM-dd");
  const endDate = format(addDays(new Date(), 6), "yyyy-MM-dd");
  return tasks.filter(t => t.assignedDate && t.assignedDate >= today && t.assignedDate <= endDate && t.status !== "Done" && t.status !== "Cancelled");
}

export function getCompletedThisWeek(tasks: Task[]): Task[] {
  const today = format(new Date(), "yyyy-MM-dd");
  const endDate = format(addDays(new Date(), 6), "yyyy-MM-dd");
  return tasks.filter(t => t.status === "Done" && t.assignedDate && t.assignedDate >= today && t.assignedDate <= endDate);
}

export function getAtRiskProjects(tasks: Task[], projects: Project[]): { project: Project; reason: string }[] {
  const tasksByProject = buildTasksByProjectIndex(tasks);
  const results: { project: Project; reason: string }[] = [];
  const todayStr = format(new Date(), "yyyy-MM-dd");

  for (const project of projects) {
    if (project.status === "Completed") continue;
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
