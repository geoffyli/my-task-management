import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useHealthErrorCount } from "@/hooks/useHealthReport";
import { navLinks } from "./nav-links";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { logout } = useAuth();
  const healthErrorCount = useHealthErrorCount();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
      />
      <aside
        ref={sidebarRef}
        className="relative flex w-64 flex-col bg-surface-panel pt-[env(safe-area-inset-top)] animate-[slide-in_200ms_ease-out]"
      >
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-[14px] font-[510] text-foreground tracking-[-0.01em]">
            Task Analytics
          </h1>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-foreground-tertiary hover:bg-surface-hover"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-[510] transition-colors duration-150",
                  isActive
                    ? "bg-interactive-active text-foreground"
                    : "text-foreground-secondary hover:bg-surface-input hover:text-foreground"
                )
              }
            >
              <Icon size={18} strokeWidth={1.5} />
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
          onClick={() => { onClose(); logout(); }}
          className="flex items-center gap-3 mx-3 mb-4 rounded-[6px] px-3 py-2.5 text-[13px] font-[510] text-foreground-tertiary hover:bg-surface-input hover:text-foreground-secondary transition-colors duration-150"
        >
          <LogOut size={18} strokeWidth={1.5} />
          Log out
        </button>
      </aside>
    </div>
  );
}
