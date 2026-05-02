import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: "default" | "red" | "green";
}

export function StatCard({ title, value, icon: Icon, trend, accent = "default" }: Props) {
  return (
    <div className="rounded-[8px] border border-border bg-[rgba(255,255,255,0.02)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-[510] text-foreground-tertiary">{title}</p>
        <Icon
          size={16}
          strokeWidth={1.5}
          className={cn(
            accent === "red" && "text-[#dc2626]",
            accent === "green" && "text-success",
            accent === "default" && "text-foreground-quaternary"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-[24px] font-[590] tracking-[-0.5px]",
          accent === "red" && "text-[#dc2626]",
          accent === "green" && "text-success",
          accent === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
      {trend && <p className="mt-1 text-[12px] font-[510] text-foreground-quaternary">{trend}</p>}
    </div>
  );
}
