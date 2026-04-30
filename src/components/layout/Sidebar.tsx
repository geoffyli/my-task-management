import { NavLink } from "react-router-dom";
import { CalendarDays, TrendingUp, FolderKanban, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "This Week", icon: CalendarDays },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/projects", label: "Projects & Areas", icon: FolderKanban },
  { to: "/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card p-4">
      <h1 className="mb-8 text-lg font-semibold text-foreground">
        Task Analytics
      </h1>
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
