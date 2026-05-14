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
const DRIFT_THRESHOLD_DAYS = 21;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_SPIRAL_RADIUS_NORM = 0.12;
const MIN_SPACING_PX = 4;
const REFERENCE_INNER_SIZE = 400;
const SPIRAL_COMPACTION = 0.85;

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

function computeSpiralOffsets(
  group: Task[],
  radii: Map<string, number>,
): Map<string, { dx: number; dy: number }> {
  const result = new Map<string, { dx: number; dy: number }>();
  const n = group.length;

  if (n <= 1) {
    if (n === 1) result.set(group[0]!.id, { dx: 0, dy: 0 });
    return result;
  }

  const maxRadiusPx = Math.max(...group.map((t) => radii.get(t.id) ?? MIN_RADIUS));
  const idealSpacingPx = maxRadiusPx + MIN_SPACING_PX;
  const cPx = idealSpacingPx * SPIRAL_COMPACTION;
  const cNorm = cPx / REFERENCE_INNER_SIZE;

  const outerRadiusNorm = cNorm * Math.sqrt(n - 1);
  const effectiveC = outerRadiusNorm > MAX_SPIRAL_RADIUS_NORM
    ? MAX_SPIRAL_RADIUS_NORM / Math.sqrt(n - 1)
    : cNorm;

  for (let i = 0; i < n; i++) {
    const task = group[i]!;
    if (i === 0) {
      result.set(task.id, { dx: 0, dy: 0 });
    } else {
      const angle = i * GOLDEN_ANGLE;
      const r = effectiveC * Math.sqrt(i);
      result.set(task.id, {
        dx: r * Math.cos(angle),
        dy: r * Math.sin(angle),
      });
    }
  }

  return result;
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
  if (eligible.length === 0) return [];

  const today = new Date();

  const radii = new Map<string, number>();
  for (const t of eligible) {
    radii.set(t.id, computeDotRadius(t.assignedDate));
  }

  const cellGroups = new Map<string, Task[]>();
  for (const t of eligible) {
    const key = `${t.urgency}|${t.importance}`;
    if (!cellGroups.has(key)) cellGroups.set(key, []);
    cellGroups.get(key)!.push(t);
  }

  for (const group of cellGroups.values()) {
    group.sort((a, b) => {
      const radiusDiff = (radii.get(b.id) ?? 0) - (radii.get(a.id) ?? 0);
      if (radiusDiff !== 0) return radiusDiff;
      return a.id.localeCompare(b.id);
    });
  }

  const offsets = new Map<string, { dx: number; dy: number }>();
  for (const [, group] of cellGroups) {
    const groupOffsets = computeSpiralOffsets(group, radii);
    for (const [id, offset] of groupOffsets) {
      offsets.set(id, offset);
    }
  }

  return eligible.map((task) => {
    const baseX = URGENCY_POSITION[task.urgency!]!;
    const baseY = IMPORTANCE_POSITION[task.importance!]!;
    const offset = offsets.get(task.id) ?? { dx: 0, dy: 0 };

    const x = Math.max(0.01, Math.min(0.99, baseX + offset.dx));
    const y = Math.max(0.01, Math.min(0.99, baseY + offset.dy));
    const radius = radii.get(task.id) ?? MIN_RADIUS;
    const quadrant = getQuadrant(baseX, baseY);

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
