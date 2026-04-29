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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Icon
          size={16}
          className={cn(
            accent === "red" && "text-red-500",
            accent === "green" && "text-green-500",
            accent === "default" && "text-muted-foreground"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          accent === "red" && "text-red-500",
          accent === "green" && "text-green-500",
          accent === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
      {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
    </div>
  );
}
