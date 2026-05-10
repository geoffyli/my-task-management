import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemePreference } from "@/lib/theme";

const options: { value: ThemePreference; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeSettings() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="rounded-[8px] border border-border bg-surface-card p-5">
      <h3 className="mb-3 text-[14px] font-[510] text-foreground">Appearance</h3>
      <p className="mb-4 text-[13px] text-foreground-tertiary">
        Choose how the dashboard looks to you. Select a theme or sync with your system setting.
      </p>
      <div className="flex gap-2">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setPreference(value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-2 rounded-[8px] border px-4 py-3 transition-colors duration-150",
              preference === value
                ? "border-accent bg-accent/5 text-accent"
                : "border-border text-foreground-tertiary hover:border-border-solid hover:text-foreground-secondary"
            )}
          >
            <Icon size={18} strokeWidth={1.5} />
            <span className="text-[12px] font-[510]">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
