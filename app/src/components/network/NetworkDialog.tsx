import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Unplug } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useTaskNetwork } from "@/hooks/useTaskNetwork";
import { NetworkGraph } from "./NetworkGraph";
import { LoadingState } from "@/components/shared/LoadingState";

interface Props {
  taskId: string | null;
  taskName: string;
  onClose: () => void;
}

export function NetworkDialog({ taskId, taskName, onClose }: Props) {
  const { isMobile } = useBreakpoint();
  const { nodes, edges, status, error } = useTaskNetwork(taskId);

  useEffect(() => {
    if (!taskId) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [taskId, onClose]);

  useEffect(() => {
    if (!taskId) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [taskId]);

  if (!taskId) return null;

  const isEmpty = status === "done" && nodes.length <= 1;

  const dialog = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 animate-[fade-in_200ms_ease-out]" />
      <div
        className={
          isMobile
            ? "relative z-10 flex flex-col bg-surface-elevated w-full h-full"
            : "relative z-10 flex flex-col bg-surface-elevated rounded-[12px] border border-border shadow-2xl w-[85vw] h-[85vh] max-w-[1400px]"
        }
      >
        <header className="flex items-center justify-between shrink-0 border-b border-border px-5 py-3">
          <h3 className="text-[14px] font-[590] text-foreground truncate pr-4">
            Network: {taskName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-[6px] p-2 text-foreground-tertiary hover:bg-interactive-hover hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 min-h-0">
          {status === "loading" && nodes.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <LoadingState variant="chart" />
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-[13px] text-foreground-tertiary">Failed to load network</p>
              <p className="text-[11px] text-foreground-quaternary">{error}</p>
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Unplug size={24} className="text-foreground-quaternary" />
              <p className="text-[13px] font-[510] text-foreground-quaternary">No connections found</p>
            </div>
          )}

          {!isEmpty && nodes.length > 0 && (
            <NetworkGraph
              nodes={nodes}
              edges={edges}
              focalId={taskId}
              status={status}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
