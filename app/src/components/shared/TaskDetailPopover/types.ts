import type { Task, Project } from "@/api/types";
import type { MatrixPoint } from "@/lib/prioritize";

export interface TaskSummary {
  id: string;
  name: string;
  status: Task["status"];
  importance: string | null;
  urgency: string | null;
  projectNames: string[];
  deadline: string | null;
  dependencyCount: number;
}

export function taskToSummary(task: Task, projects: Project[]): TaskSummary {
  const projectNames = task.projectIds
    .map((pid) => projects.find((p) => p.id === pid)?.name)
    .filter((n): n is string => !!n);

  return {
    id: task.id,
    name: task.name,
    status: task.status,
    importance: task.importance,
    urgency: task.urgency,
    projectNames,
    deadline: task.deadline,
    dependencyCount: task.dependencies.length,
  };
}

export function matrixPointToSummary(point: MatrixPoint): TaskSummary {
  return {
    id: point.id,
    name: point.name,
    status: point.status,
    importance: point.importance,
    urgency: point.urgency,
    projectNames: point.projectNames,
    deadline: point.deadline,
    dependencyCount: point.dependencyCount,
  };
}
