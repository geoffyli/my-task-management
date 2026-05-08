import type { MatrixPoint } from "@/lib/prioritize";
import { STATUS_COLORS } from "@/lib/constants";

interface Props {
  point: MatrixPoint;
  anchorRect: DOMRect;
}

export function MatrixTooltip({ point, anchorRect }: Props) {
  const OFFSET = 12;
  const left = anchorRect.right + OFFSET;
  const top = anchorRect.top + anchorRect.height / 2;

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#191a1b] px-3 py-2 shadow-lg"
      style={{ left, top, transform: "translateY(-50%)" }}
    >
      <p className="text-[12px] font-[590] text-foreground truncate max-w-[200px]">
        {point.name}
      </p>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-foreground-tertiary">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: STATUS_COLORS[point.status] }}
        />
        <span>{point.status}</span>
      </div>
      {point.projectNames.length > 0 && (
        <p className="mt-1 text-[11px] text-foreground-quaternary truncate max-w-[200px]">
          {point.projectNames.join(", ")}
        </p>
      )}
      <div className="mt-1 flex gap-3 text-[10px] text-foreground-quaternary">
        <span>U: {point.urgency}</span>
        <span>I: {point.importance}</span>
        {point.deadline && <span>Due: {point.deadline}</span>}
      </div>
      {point.daysSinceAssigned !== null && (
        <p className="mt-0.5 text-[10px] text-foreground-quaternary">
          {point.daysSinceAssigned}d since assigned
        </p>
      )}
    </div>
  );
}
