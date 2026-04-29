import { NavLink } from "react-router-dom";
import { LayoutDashboard, Clock, FolderKanban, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/timeline", label: "Timeline", icon: Clock },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/areas", label: "Areas", icon: Layers },
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
