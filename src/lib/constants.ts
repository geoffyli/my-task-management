import type { CSSProperties } from "react";
import type { Task } from "@/api/types";

export const STATUS_COLORS: Record<Task["status"], string> = {
  "Not Started": "#6b7280",
  "In Progress": "#3b82f6",
  Done: "#22c55e",
  Cancelled: "#ef4444",
  Deferred: "#f59e0b",
};

export const PRIORITY_COLORS: Record<Task["priority"], string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#6b7280",
};

export const AREA_COLORS: Record<string, string> = {
  "Health & Fitness": "#22c55e",
  Academics: "#3b82f6",
  Productivity: "#8b5cf6",
  Career: "#f59e0b",
  Tech: "#06b6d4",
  "Investment and Wealth Management": "#ec4899",
  "Insights and Perspectives": "#14b8a6",
};

export const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: "8px",
  fontSize: "12px",
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
};

export type TimeRange = "30d" | "90d" | "6m" | "all";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "6m", label: "6 months" },
  { value: "all", label: "All time" },
];

export function isActiveTask(t: Task): boolean {
  return t.status !== "Done" && t.status !== "Cancelled";
}
