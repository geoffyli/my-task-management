import { differenceInDays, parseISO, format, eachWeekOfInterval } from "date-fns";
import type { Task, Project } from "@/api/types";
import type { TimeRange } from "@/lib/constants";
import { isActiveTask } from "@/lib/constants";
import { getTimeRangeStart } from "./date-utils";

export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter(isActiveTask);
}

export function getOverdueTasks(tasks: Task[]): Task[] {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter(
    (t) => t.deadline && t.deadline < today && isActiveTask(t)
  );
}

export function getCompletedThisWeek(tasks: Task[]): Task[] {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return tasks.filter(
    (t) => t.status === "Done" && parseISO(t.lastEditedTime) >= weekAgo
  );
}

export function getAverageAge(activeTasks: Task[]): number {
  if (activeTasks.length === 0) return 0;
  const totalDays = activeTasks.reduce(
    (sum, t) => sum + differenceInDays(new Date(), parseISO(t.createdTime)),
    0
  );
  return Math.round(totalDays / activeTasks.length);
}

export function getStatusCounts(tasks: Task[]): { status: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

export function getPriorityCounts(activeTasks: Task[]): { priority: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const t of activeTasks) {
    counts[t.priority] = (counts[t.priority] ?? 0) + 1;
  }
  return Object.entries(counts).map(([priority, count]) => ({ priority, count }));
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

  const createdByWeek = new Map<number, number>();
  const completedByWeek = new Map<number, number>();
  for (const t of tasks) {
    const createdTs = parseISO(t.createdTime).getTime();
    for (let i = 0; i < weeks.length; i++) {
      const ws = weeks[i]!.getTime();
      const we = ws + 6 * 86400000;
      if (createdTs >= ws && createdTs <= we) {
        createdByWeek.set(i, (createdByWeek.get(i) ?? 0) + 1);
        break;
      }
    }
    if (t.status === "Done") {
      const doneTs = parseISO(t.lastEditedTime).getTime();
      for (let i = 0; i < weeks.length; i++) {
        const ws = weeks[i]!.getTime();
        const we = ws + 6 * 86400000;
        if (doneTs >= ws && doneTs <= we) {
          completedByWeek.set(i, (completedByWeek.get(i) ?? 0) + 1);
          break;
        }
      }
    }
  }

  return weeks.map((weekStart, i) => ({
    week: format(weekStart, "MMM dd"),
    created: createdByWeek.get(i) ?? 0,
    completed: completedByWeek.get(i) ?? 0,
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
        const closed = parseISO(t.lastEditedTime).getTime();
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
      high: inBucket.filter((t) => t.priority === "High").length,
      medium: inBucket.filter((t) => t.priority === "Medium").length,
      low: inBucket.filter((t) => t.priority === "Low").length,
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
}

export function getProjectHealth(tasks: Task[], projects: Project[]): ProjectHealthEntry[] {
  const tasksByProject = buildTasksByProjectIndex(tasks);
  return projects.map((p) => {
    const projectTasks = tasksByProject.get(p.id) ?? [];
    return {
      project: p.name,
      notStarted: projectTasks.filter((t) => t.status === "Not Started").length,
      inProgress: projectTasks.filter((t) => t.status === "In Progress").length,
      done: projectTasks.filter((t) => t.status === "Done").length,
    };
  }).filter((p) => p.notStarted + p.inProgress + p.done > 0);
}

export function buildTasksByProjectIndex(tasks: Task[]): Map<string, Task[]> {
  const index = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.projectId) {
      const list = index.get(t.projectId);
      if (list) list.push(t);
      else index.set(t.projectId, [t]);
    }
  }
  return index;
}

export interface CalendarDayEntry {
  date: string;
  count: number;
}

export function getCalendarHeatmapData(tasks: Task[]): CalendarDayEntry[] {
  const dayCounts: Record<string, number> = {};

  for (const t of tasks) {
    const created = t.createdTime.slice(0, 10);
    dayCounts[created] = (dayCounts[created] ?? 0) + 1;

    if (t.status === "Done") {
      const completed = t.lastEditedTime.slice(0, 10);
      dayCounts[completed] = (dayCounts[completed] ?? 0) + 1;
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
  priority: string;
}

export function getDeadlineProximity(tasks: Task[]): DeadlineEntry[] {
  const today = new Date();
  return tasks
    .filter((t) => t.deadline && isActiveTask(t))
    .map((t) => ({
      name: t.name,
      deadline: t.deadline!,
      daysRemaining: differenceInDays(parseISO(t.deadline!), today),
      priority: t.priority,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
