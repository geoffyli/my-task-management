import { useEffect, useRef } from "react";
import { ExternalLink, Network } from "lucide-react";
import type { TaskSummary } from "./types";
import { STATUS_COLORS, IMPORTANCE_COLORS } from "@/lib/constants";
import { getNotionUrl } from "@/lib/health";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { useBreakpoint } from "@/hooks/useBreakpoint";

interface Props {
  task: TaskSummary;
  anchorRect: DOMRect;
  onClose: () => void;
  onViewNetwork: (taskId: string) => void;
}

function PopoverContent({ task, onViewNetwork, onClose }: { task: TaskSummary; onViewNetwork: (id: string) => void; onClose: () => void }) {
  return (
    <>
      <h4 className="text-[13px] font-[590] text-foreground leading-tight">
        {task.name}
      </h4>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="data" style={{ background: STATUS_COLORS[task.status] + "22", color: STATUS_COLORS[task.status] }}>
          {task.status}
        </Badge>
        {task.importance && (
          <Badge variant="data" style={{ background: (IMPORTANCE_COLORS[task.importance] ?? "#6b7280") + "22", color: IMPORTANCE_COLORS[task.importance] ?? "#6b7280" }}>
            I: {task.importance}
          </Badge>
        )}
        {task.urgency && (
          <Badge variant="subtle">U: {task.urgency}</Badge>
        )}
      </div>

      {task.projectNames.length > 0 && (
        <p className="mt-2 text-[12px] text-foreground-tertiary">
          {task.projectNames.join(", ")}
        </p>
      )}

      <div className="mt-2 space-y-0.5 text-[11px] text-foreground-quaternary">
        {task.deadline && <p>Deadline: {task.deadline}</p>}
        {task.dependencyCount > 0 && (
          <p>{task.dependencyCount} {task.dependencyCount === 1 ? "dependency" : "dependencies"}</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="subtle"
          size="sm"
          onClick={() => { onViewNetwork(task.id); onClose(); }}
        >
          <Network size={13} className="mr-1.5" />
          View Network
        </Button>
        <a
          href={getNotionUrl(task.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-[6px] px-2.5 py-1 text-[12px] font-[510] text-foreground-secondary hover:text-foreground transition-colors"
        >
          <ExternalLink size={12} className="mr-1.5" />
          Open in Notion
        </a>
      </div>
    </>
  );
}

export function TaskDetailPopover({ task, anchorRect, onClose, onViewNetwork }: Props) {
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
        <PopoverContent task={task} onViewNetwork={onViewNetwork} onClose={onClose} />
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
      className="fixed z-50 rounded-[8px] border border-border bg-surface-elevated p-4 shadow-xl"
      style={{ left, top, width: POPOVER_WIDTH }}
    >
      <PopoverContent task={task} onViewNetwork={onViewNetwork} onClose={onClose} />
    </div>
  );
}
