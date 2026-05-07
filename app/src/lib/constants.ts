import type { CSSProperties } from "react";
import type { Task } from "@/api/types";
import type { HealthSeverity } from "@/lib/health";

export const STATUS_COLORS: Record<Task["status"], string> = {
  "Not Started": "#6b7280",
  "In Progress": "#5e6ad2",
  Done: "#27a644",
  Cancelled: "#dc2626",
  Blocked: "#d97706",
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#d97706",
  Low: "#6b7280",
};

export const AREA_COLORS: Record<string, string> = {
  "Health & Fitness": "#27a644",
  Academics: "#5e6ad2",
  Productivity: "#8b5cf6",
  Career: "#d97706",
  Tech: "#06b6d4",
  "Investment and Wealth Management": "#ec4899",
  "Insights and Perspectives": "#14b8a6",
};

const AREA_PALETTE = [
  "#f97316", "#6366f1", "#84cc16", "#a855f7", "#0ea5e9",
  "#e11d48", "#10b981", "#d946ef", "#eab308", "#64748b",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAreaColor(name: string): string {
  return AREA_COLORS[name] ?? AREA_PALETTE[hashString(name) % AREA_PALETTE.length]!;
}

export const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 510,
  background: "#191a1b",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#d0d6e0",
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

export const SEVERITY_COLORS: Record<HealthSeverity, string> = {
  error: "#dc2626",
  warning: "#d97706",
  info: "#5e6ad2",
};
