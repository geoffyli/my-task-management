import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, TrendingUp, Crosshair, FolderKanban, Activity, Settings } from "lucide-react";

export interface NavLinkItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navLinks: NavLinkItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/prioritize", label: "Prioritize", icon: Crosshair },
  { to: "/projects", label: "Projects & Areas", icon: FolderKanban },
  { to: "/health", label: "Health", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];
