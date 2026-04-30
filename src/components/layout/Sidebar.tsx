import { NavLink } from "react-router-dom";
import { CalendarDays, TrendingUp, FolderKanban, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { to: "/", label: "This Week", icon: CalendarDays },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/projects", label: "Projects & Areas", icon: FolderKanban },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="flex w-56 flex-col border-r border-border-subtle bg-surface-panel px-3 py-4">
      <h1 className="mb-8 px-3 text-[14px] font-[510] text-foreground tracking-[-0.01em]">
        Task Analytics
      </h1>
      <nav className="flex flex-1 flex-col gap-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-[6px] px-3 py-2 text-[13px] font-[510] transition-colors duration-150",
                isActive
                  ? "bg-[rgba(255,255,255,0.06)] text-foreground"
                  : "text-foreground-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground"
              )
            }
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-3 rounded-[6px] px-3 py-2 text-[13px] font-[510] text-foreground-tertiary hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground-secondary transition-colors duration-150"
      >
        <LogOut size={16} strokeWidth={1.5} />
        Log out
      </button>
    </aside>
  );
}
