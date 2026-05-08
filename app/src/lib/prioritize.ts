import { differenceInDays, parseISO } from "date-fns";
import type { Task, Project } from "@/api/types";

export type Quadrant = "do-first" | "schedule" | "delegate" | "eliminate";

export interface MatrixPoint {
  id: string;
  name: string;
  status: Task["status"];
  importance: "High" | "Medium" | "Low";
  urgency: "High" | "Medium" | "Low";
  x: number;
  y: number;
  radius: number;
  quadrant: Quadrant;
  projectIds: string[];
  projectNames: string[];
  deadline: string | null;
  assignedDate: string | null;
  daysSinceAssigned: number | null;
  dependencyCount: number;
}

export interface MatrixInsightData {
  doFirstCount: number;
  scheduleCount: number;
  delegateCount: number;
  eliminateCount: number;
  q2Ratio: number;
  q2RatioStatus: "healthy" | "amber" | "red";
  totalPlotted: number;
}

const URGENCY_POSITION: Record<string, number> = {
  Low: 0.15,
  Medium: 0.50,
  High: 0.85,
};

const IMPORTANCE_POSITION: Record<string, number> = {
  Low: 0.15,
  Medium: 0.50,
  High: 0.85,
};

const MIN_RADIUS = 6;
const MAX_RADIUS = 24;
const MAX_DAYS_CAP = 90;
const MICRO_OFFSET_X_BAND = 0.12;
const MICRO_OFFSET_Y_BAND = 0.08;
const DRIFT_THRESHOLD_DAYS = 21;

export function getMatrixEligibleTasks(tasks: Task[]): Task[] {
  return tasks.filter(
    (t) =>
      (t.status === "Not Started" || t.status === "In Progress") &&
      t.urgency !== null &&
      t.urgency !== "Overdue" &&
      t.importance !== null,
  );
}

export function getNullFieldExclusionCount(tasks: Task[]): number {
  return tasks.filter(
    (t) =>
      (t.status === "Not Started" || t.status === "In Progress") &&
      (t.importance === null || t.urgency === null || t.urgency === "Overdue"),
  ).length;
}

export function computeDotRadius(assignedDate: string | null): number {
  if (!assignedDate) return MIN_RADIUS;
  const days = differenceInDays(new Date(), parseISO(assignedDate));
  if (days <= 0) return MIN_RADIUS;
  const normalized = Math.min(days, MAX_DAYS_CAP) / MAX_DAYS_CAP;
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(normalized);
}

function computeMicroOffsetX(task: Task, groupStats: { minDays: number; maxDays: number } | null): number {
  if (!task.deadline || !groupStats) return 0;
  const { minDays, maxDays } = groupStats;
  if (maxDays === minDays) return 0;

  const daysToDeadline = differenceInDays(parseISO(task.deadline), new Date());
  const normalized = 1 - (daysToDeadline - minDays) / (maxDays - minDays);
  return (normalized - 0.5) * MICRO_OFFSET_X_BAND * 2;
}

function computeMicroOffsetY(task: Task, maxDeps: number): number {
  const depCount = task.dependencies.length;
  if (depCount === 0 || maxDeps === 0) return 0;

  const normalized = depCount / maxDeps;
  return (normalized - 0.5) * MICRO_OFFSET_Y_BAND * 2;
}

export function getQuadrant(x: number, y: number): Quadrant {
  if (x >= 0.5 && y >= 0.5) return "do-first";
  if (x < 0.5 && y >= 0.5) return "schedule";
  if (x >= 0.5 && y < 0.5) return "delegate";
  return "eliminate";
}

export function computeMatrixPoints(
  tasks: Task[],
  projectLookup: Map<string, Project>,
): MatrixPoint[] {
  const eligible = getMatrixEligibleTasks(tasks);

  const byUrgency = new Map<string, Task[]>();
  const byImportance = new Map<string, Task[]>();
  for (const t of eligible) {
    const urg = t.urgency!;
    const imp = t.importance!;
    if (!byUrgency.has(urg)) byUrgency.set(urg, []);
    byUrgency.get(urg)!.push(t);
    if (!byImportance.has(imp)) byImportance.set(imp, []);
    byImportance.get(imp)!.push(t);
  }

  // Precompute deadline stats per urgency group
  const today = new Date();
  const urgencyDeadlineStats = new Map<string, { minDays: number; maxDays: number } | null>();
  for (const [urg, group] of byUrgency) {
    const deadlineDays = group
      .filter((t) => t.deadline)
      .map((t) => differenceInDays(parseISO(t.deadline!), today));
    if (deadlineDays.length <= 1) {
      urgencyDeadlineStats.set(urg, null);
    } else {
      urgencyDeadlineStats.set(urg, {
        minDays: Math.min(...deadlineDays),
        maxDays: Math.max(...deadlineDays),
      });
    }
  }

  // Precompute max dependency count per importance group
  const importanceMaxDeps = new Map<string, number>();
  for (const [imp, group] of byImportance) {
    importanceMaxDeps.set(imp, Math.max(...group.map((t) => t.dependencies.length), 0));
  }

  return eligible.map((task) => {
    const baseX = URGENCY_POSITION[task.urgency!]!;
    const baseY = IMPORTANCE_POSITION[task.importance!]!;
    const offsetX = computeMicroOffsetX(task, urgencyDeadlineStats.get(task.urgency!) ?? null);
    const offsetY = computeMicroOffsetY(task, importanceMaxDeps.get(task.importance!) ?? 0);

    const x = Math.max(0.01, Math.min(0.99, baseX + offsetX));
    const y = Math.max(0.01, Math.min(0.99, baseY + offsetY));
    const radius = computeDotRadius(task.assignedDate);
    const quadrant = getQuadrant(x, y);

    const projectNames = task.projectIds
      .map((pid) => projectLookup.get(pid)?.name)
      .filter(Boolean) as string[];

    const daysSinceAssigned = task.assignedDate
      ? differenceInDays(today, parseISO(task.assignedDate))
      : null;

    return {
      id: task.id,
      name: task.name,
      status: task.status,
      importance: task.importance as "High" | "Medium" | "Low",
      urgency: task.urgency as "High" | "Medium" | "Low",
      x,
      y,
      radius,
      quadrant,
      projectIds: task.projectIds,
      projectNames,
      deadline: task.deadline,
      assignedDate: task.assignedDate,
      daysSinceAssigned,
      dependencyCount: task.dependencies.length,
    };
  });
}

export function computeDriftCount(tasks: Task[]): number {
  const now = Date.now();
  return tasks.filter(
    (t) =>
      (t.status === "Not Started" || t.status === "In Progress") &&
      t.importance === "High" &&
      t.urgency === "High" &&
      now - new Date(t.createdTime).getTime() >= DRIFT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  ).length;
}

export function computeMatrixInsights(
  points: MatrixPoint[],
  totalActiveTasks: number,
): MatrixInsightData {
  const counts: Record<Quadrant, number> = {
    "do-first": 0,
    schedule: 0,
    delegate: 0,
    eliminate: 0,
  };
  for (const p of points) counts[p.quadrant]++;

  const q2Ratio =
    totalActiveTasks > 0 ? Math.round((counts.schedule / totalActiveTasks) * 100) : 0;

  const q2RatioStatus: "healthy" | "amber" | "red" =
    q2Ratio >= 40 ? "healthy" : q2Ratio >= 20 ? "amber" : "red";

  return {
    doFirstCount: counts["do-first"],
    scheduleCount: counts.schedule,
    delegateCount: counts.delegate,
    eliminateCount: counts.eliminate,
    q2Ratio,
    q2RatioStatus,
    totalPlotted: points.length,
  };
}
