import { useEffect, useRef } from "react";
import type { MatrixPoint } from "@/lib/prioritize";
import { STATUS_COLORS } from "@/lib/constants";
import { getNotionUrl } from "@/lib/health";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { useBreakpoint } from "@/hooks/useBreakpoint";

interface Props {
  point: MatrixPoint;
  anchorRect: DOMRect;
  onClose: () => void;
}

function PopoverContent({ point }: { point: MatrixPoint }) {
  return (
    <>
      <h4 className="text-[13px] font-[590] text-foreground leading-tight">
        {point.name}
      </h4>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="data" style={{ background: STATUS_COLORS[point.status] + "22", color: STATUS_COLORS[point.status] }}>
          {point.status}
        </Badge>
        <Badge variant="subtle">U: {point.urgency}</Badge>
        <Badge variant="subtle">I: {point.importance}</Badge>
      </div>

      {point.projectNames.length > 0 && (
        <p className="mt-2 text-[12px] text-foreground-tertiary">
          {point.projectNames.join(", ")}
        </p>
      )}

      <div className="mt-2 space-y-0.5 text-[11px] text-foreground-quaternary">
        {point.assignedDate && (
          <p>Assigned: {point.assignedDate} ({point.daysSinceAssigned}d ago)</p>
        )}
        {point.deadline && <p>Deadline: {point.deadline}</p>}
        {point.dependencyCount > 0 && (
          <p>{point.dependencyCount} {point.dependencyCount === 1 ? "dependency" : "dependencies"}</p>
        )}
      </div>

      <a
        href={getNotionUrl(point.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center rounded-[6px] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-[12px] font-[510] text-foreground-secondary hover:bg-[rgba(255,255,255,0.1)] hover:text-foreground transition-colors min-h-[44px]"
      >
        Open in Notion ↗
      </a>
    </>
  );
}

export function TaskPopover({ point, anchorRect, onClose }: Props) {
  const { isMobile } = useBreakpoint();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleResize() {
      onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    };
  }, [onClose, isMobile]);

  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose} title="Task Details">
        <PopoverContent point={point} />
      </BottomSheet>
    );
  }

  const OFFSET = 16;
  const POPOVER_WIDTH = 280;
  const viewport = { width: window.innerWidth, height: window.innerHeight };

  let left = anchorRect.right + OFFSET;
  if (left + POPOVER_WIDTH > viewport.width) {
    left = anchorRect.left - POPOVER_WIDTH - OFFSET;
  }

  let top = anchorRect.top + anchorRect.height / 2 - 100;
  if (top < 8) top = 8;
  if (top + 200 > viewport.height) top = viewport.height - 208;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#1e1f20] p-4 shadow-xl"
      style={{ left, top, width: POPOVER_WIDTH }}
    >
      <PopoverContent point={point} />
    </div>
  );
}
