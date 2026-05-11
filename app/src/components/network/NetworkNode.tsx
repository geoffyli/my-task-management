import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { STATUS_COLORS } from "@/lib/constants";

export interface NetworkNodeData {
  label: string;
  fullName: string;
  status: string;
  isFocal: boolean;
  [key: string]: unknown;
}

export const NetworkNodeComponent = memo(function NetworkNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as NetworkNodeData;
  const statusColor = STATUS_COLORS[nodeData.status as keyof typeof STATUS_COLORS] ?? "#6b7280";

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div
        className={`flex items-center gap-2 rounded-[8px] border bg-surface-card px-3 py-2 shadow-sm transition-shadow ${
          nodeData.isFocal
            ? "border-accent ring-2 ring-accent/30"
            : "border-border hover:shadow-md"
        }`}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-[12px] font-[510] text-foreground leading-tight max-w-[160px] truncate">
          {nodeData.label}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
    </>
  );
});
