import { differenceInDays, parseISO } from "date-fns";
import type { Task, Project } from "@/api/types";

export type HealthSeverity = "error" | "warning" | "info";
export type HealthEntityType = "task" | "project";

export interface HealthRule {
  id: string;
  name: string;
  description: string;
  severity: HealthSeverity;
  entityType: HealthEntityType;
}

export interface HealthViolation {
  ruleId: string;
  entityId: string;
  entityName: string;
  entityType: HealthEntityType;
  context: string;
}

export interface HealthRuleResult {
  rule: HealthRule;
  violations: HealthViolation[];
}

export interface HealthReport {
  errors: number;
  warnings: number;
  info: number;
  results: HealthRuleResult[];
}

export const HEALTH_RULES: HealthRule[] = [
  { id: "task-importance-not-set", name: "Importance not set", severity: "error", entityType: "task", description: "All tasks should have Importance set for proper triage" },
  { id: "task-urgency-not-set", name: "Urgency not set", severity: "error", entityType: "task", description: "All tasks should have Urgency set for scheduling" },
  { id: "task-deadline-not-set", name: "Deadline not set (high urgency)", severity: "error", entityType: "task", description: "Tasks with High urgency or Overdue must have a Deadline" },
  { id: "task-assigned-date-not-set", name: "Assigned Date not set", severity: "error", entityType: "task", description: "In Progress tasks must have an Assigned Date" },
  { id: "task-started-date-not-set", name: "Started Date not set", severity: "error", entityType: "task", description: "In Progress or Done tasks must have a Started Date" },
  { id: "task-closed-date-not-set", name: "Closed Date not set", severity: "error", entityType: "task", description: "Done or Cancelled tasks must have a Closed Date" },
  { id: "task-deadline-missed", name: "Deadline missed, no progress", severity: "error", entityType: "task", description: "Task has a past Deadline but Status is still Not Started" },
  { id: "task-initial-assigned-not-set", name: "Initial Assigned Date not set", severity: "warning", entityType: "task", description: "Tasks with Assigned Date should also have Initial Assigned Date for reschedule tracking" },
  { id: "task-assigned-past-not-started", name: "Assigned Date in past, not started", severity: "info", entityType: "task", description: "Task was scheduled more than 1 day ago but hasn't started" },
  { id: "project-no-area", name: "No Area assigned", severity: "warning", entityType: "project", description: "Projects should be categorized into an Area" },
  { id: "project-priority-not-set", name: "Priority not set", severity: "warning", entityType: "project", description: "Active projects should have Priority set" },
];

const SEVERITY_ORDER: Record<HealthSeverity, number> = { error: 0, warning: 1, info: 2 };

type RuleEvaluator = (tasks: Task[], projects: Project[]) => HealthViolation[];

function makeViolation(ruleId: string, entity: { id: string; name: string }, entityType: HealthEntityType, context: string): HealthViolation {
  return { ruleId, entityId: entity.id, entityName: entity.name, entityType, context };
}

export const RULE_EVALUATORS: Record<string, RuleEvaluator> = {
  "task-importance-not-set": (tasks) =>
    tasks
      .filter((t) => t.importance === null)
      .map((t) => makeViolation("task-importance-not-set", t, "task", `Status: ${t.status}`)),

  "task-urgency-not-set": (tasks) =>
    tasks
      .filter((t) => t.urgency === null)
      .map((t) => makeViolation("task-urgency-not-set", t, "task", `Status: ${t.status}`)),

  "task-deadline-not-set": (tasks) =>
    tasks
      .filter((t) => (t.urgency === "High" || t.urgency === "Overdue") && !t.deadline)
      .map((t) => makeViolation("task-deadline-not-set", t, "task", `Urgency: ${t.urgency}`)),

  "task-assigned-date-not-set": (tasks) =>
    tasks
      .filter((t) => t.status === "In Progress" && !t.assignedDate)
      .map((t) => makeViolation("task-assigned-date-not-set", t, "task", "Status: In Progress")),

  "task-started-date-not-set": (tasks) =>
    tasks
      .filter((t) => (t.status === "In Progress" || t.status === "Done") && !t.startedDate)
      .map((t) => makeViolation("task-started-date-not-set", t, "task", `Status: ${t.status}`)),

  "task-closed-date-not-set": (tasks) =>
    tasks
      .filter((t) => (t.status === "Done" || t.status === "Cancelled") && !t.closedDate)
      .map((t) => makeViolation("task-closed-date-not-set", t, "task", `Status: ${t.status}`)),

  "task-deadline-missed": (tasks) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return tasks
      .filter((t) => t.status === "Not Started" && t.deadline && t.deadline < todayStr)
      .map((t) => makeViolation("task-deadline-missed", t, "task", `Deadline: ${t.deadline}`));
  },

  "task-initial-assigned-not-set": (tasks) =>
    tasks
      .filter((t) => t.assignedDate && !t.initialAssignedDate)
      .map((t) => makeViolation("task-initial-assigned-not-set", t, "task", `Assigned: ${t.assignedDate}`)),

  "task-assigned-past-not-started": (tasks) => {
    const today = new Date();
    return tasks
      .filter((t) => {
        if (t.status !== "Not Started" || !t.assignedDate) return false;
        return differenceInDays(today, parseISO(t.assignedDate)) > 1;
      })
      .map((t) => makeViolation("task-assigned-past-not-started", t, "task", `Assigned: ${t.assignedDate}`));
  },

  "project-no-area": (_tasks, projects) =>
    projects
      .filter((p) => p.areaIds.length === 0)
      .map((p) => makeViolation("project-no-area", p, "project", `Status: ${p.status}`)),

  "project-priority-not-set": (_tasks, projects) =>
    projects
      .filter((p) => (p.status === "In Progress" || p.status === "In Maintenance") && p.priority === null)
      .map((p) => makeViolation("project-priority-not-set", p, "project", `Status: ${p.status}`)),
};

export function computeHealthReport(
  tasks: Task[],
  projects: Project[],
  cutoffDate: string | null,
): HealthReport {
  const filteredTasks = cutoffDate
    ? tasks.filter((t) => t.createdTime >= cutoffDate)
    : tasks;

  const filteredProjects = projects.filter((p) => p.status !== "Archived");

  const results: HealthRuleResult[] = HEALTH_RULES.map((rule) => {
    const evaluator = RULE_EVALUATORS[rule.id]!;
    const violations = evaluator(filteredTasks, filteredProjects);
    return { rule, violations };
  })
    .filter((r) => r.violations.length > 0)
    .sort((a, b) => SEVERITY_ORDER[a.rule.severity] - SEVERITY_ORDER[b.rule.severity]);

  let errors = 0, warnings = 0, info = 0;
  for (const r of results) {
    const count = r.violations.length;
    if (r.rule.severity === "error") errors += count;
    else if (r.rule.severity === "warning") warnings += count;
    else info += count;
  }

  return { errors, warnings, info, results };
}

export function getNotionUrl(pageId: string): string {
  return `https://notion.so/${pageId.replace(/-/g, "")}`;
}

export function computeHealthScore(report: HealthReport): number {
  const penalty = report.errors * 5 + report.warnings * 2 + report.info * 0.5;
  return Math.max(0, Math.round(100 - penalty));
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "#27a644";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}
