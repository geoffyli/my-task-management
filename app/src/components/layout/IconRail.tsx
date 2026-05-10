import { NavLink } from "react-router-dom";
import { CalendarDays, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useHealthErrorCount } from "@/hooks/useHealthReport";
import { navLinks } from "./nav-links";

export function IconRail() {
  const { logout } = useAuth();
  const healthErrorCount = useHealthErrorCount();

  return (
    <aside className="flex w-16 flex-col items-center border-r border-border-subtle bg-surface-panel py-4 gap-1">
      <div className="mb-6 flex h-8 w-8 items-center justify-center rounded-[6px] bg-accent/10 text-accent">
        <CalendarDays size={16} strokeWidth={1.5} />
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={label}
            className={({ isActive }) =>
              cn(
                "relative flex h-10 w-10 items-center justify-center rounded-[6px] transition-colors duration-150",
                isActive
                  ? "bg-[rgba(255,255,255,0.06)] text-foreground"
                  : "text-foreground-tertiary hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground-secondary"
              )
            }
          >
            <Icon size={18} strokeWidth={1.5} />
            {to === "/health" && healthErrorCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#dc2626] text-[8px] font-[600] text-white">
                {healthErrorCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={logout}
        title="Log out"
        className="flex h-10 w-10 items-center justify-center rounded-[6px] text-foreground-tertiary hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground-secondary transition-colors duration-150"
      >
        <LogOut size={18} strokeWidth={1.5} />
      </button>
    </aside>
  );
}
