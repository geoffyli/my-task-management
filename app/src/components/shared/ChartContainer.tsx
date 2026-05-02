import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  onExport?: () => void;
}

export function ChartContainer({ title, description, children, className, onExport }: Props) {
  return (
    <div className={cn("rounded-[8px] border border-border bg-[rgba(255,255,255,0.02)] p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-[510] text-foreground tracking-[-0.01em]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-[13px] text-foreground-tertiary">{description}</p>
          )}
        </div>
        {onExport && (
          <Button variant="icon" size="sm" onClick={onExport} title="Download CSV">
            <Download size={14} strokeWidth={1.5} />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
