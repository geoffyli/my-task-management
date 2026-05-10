import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useHealthErrorCount } from "@/hooks/useHealthReport";
import { navLinks } from "./nav-links";

export function Sidebar() {
  const { logout } = useAuth();
  const healthErrorCount = useHealthErrorCount();

  return (
    <aside className="flex w-56 flex-col border-r border-border-subtle bg-surface-panel px-3 py-4">
      <h1 className="mb-8 px-3 text-[14px] font-[510] text-foreground tracking-[-0.01em]">
        Task Analytics
      </h1>
      <nav className="flex flex-1 flex-col gap-0.5">
        {navLinks.map(({ to, label, icon: Icon }) => (
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
            {to === "/health" && healthErrorCount > 0 && (
              <span className="ml-auto rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-[600] leading-none text-white min-w-[18px] text-center">
                {healthErrorCount}
              </span>
            )}
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
