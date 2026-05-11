import { NavLink } from "react-router-dom";
import { CalendarDays, TrendingUp, Crosshair, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Week", icon: CalendarDays },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/prioritize", label: "Prioritize", icon: Crosshair },
  { to: "/health", label: "Health", icon: Activity },
];

export function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-end border-t border-border-subtle bg-surface-panel pb-[env(safe-area-inset-bottom)]">
      <div className="absolute left-0 right-0 top-full h-20 bg-inherit" />
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-[510] transition-colors duration-150",
              isActive ? "text-accent-light" : "text-foreground-tertiary"
            )
          }
        >
          <Icon size={22} strokeWidth={1.5} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
