import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  onExport?: () => void;
}

export function ChartContainer({ title, description, children, className, onExport }: Props) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Download CSV"
          >
            <Download size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
