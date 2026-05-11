import { ExternalLink } from "lucide-react";
import { STATUS_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { getNotionUrl } from "@/lib/health";

interface Props {
  nodeId: string;
  fullName: string;
  status: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function NodeTooltip({ nodeId, fullName, status, position, onClose }: Props) {
  const statusColor = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? "#6b7280";

  return (
    <div
      className="fixed z-[70] rounded-[8px] border border-border bg-surface-elevated p-3 shadow-xl max-w-[240px]"
      style={{ left: position.x + 8, top: position.y + 8 }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[12px] font-[590] text-foreground leading-tight mb-2">
        {fullName}
      </p>
      <Badge variant="data" style={{ background: statusColor + "22", color: statusColor }}>
        {status}
      </Badge>
      <div className="mt-2.5 pt-2 border-t border-border">
        <a
          href={getNotionUrl(nodeId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-[11px] font-[510] text-foreground-secondary hover:text-foreground transition-colors"
          onClick={onClose}
        >
          <ExternalLink size={11} className="mr-1" />
          Open in Notion
        </a>
      </div>
    </div>
  );
}
