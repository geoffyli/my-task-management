import { useCallback, useState } from "react";
import type { TaskSummary } from "@/components/shared/TaskDetailPopover";

interface NetworkTarget {
  id: string;
  name: string;
}

export function useTaskPopover() {
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [networkTarget, setNetworkTarget] = useState<NetworkTarget | null>(null);

  const open = useCallback((task: TaskSummary, rect: DOMRect) => {
    setSelectedTask(task);
    setAnchorRect(rect);
  }, []);

  const close = useCallback(() => {
    setSelectedTask(null);
    setAnchorRect(null);
  }, []);

  const openNetwork = useCallback((taskId: string) => {
    const name = selectedTask?.name ?? "";
    close();
    setNetworkTarget({ id: taskId, name });
  }, [selectedTask, close]);

  const closeNetwork = useCallback(() => {
    setNetworkTarget(null);
  }, []);

  return {
    selectedTask,
    anchorRect,
    networkTaskId: networkTarget?.id ?? null,
    networkTaskName: networkTarget?.name ?? "",
    open,
    close,
    openNetwork,
    closeNetwork,
  };
}
