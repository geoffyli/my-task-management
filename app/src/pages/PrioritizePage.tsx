import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTasks, useProjects, useAreas } from "@/api/queries";
import type { Project } from "@/api/types";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskDetailPopover, matrixPointToSummary } from "@/components/shared/TaskDetailPopover";
import { EisenhowerMatrix } from "@/components/prioritize/EisenhowerMatrix";
import { MatrixTooltip } from "@/components/prioritize/MatrixTooltip";
import { MatrixFilters } from "@/components/prioritize/MatrixFilters";
import { MatrixInsights } from "@/components/prioritize/MatrixInsights";
import { NullValueCallout } from "@/components/prioritize/NullValueCallout";
import { NetworkDialog } from "@/components/network";
import { useTaskPopover } from "@/hooks/useTaskPopover";
import {
  computeMatrixPoints,
  computeMatrixInsights,
  computeDriftCount,
  getNullFieldExclusionCount,
  type MatrixPoint,
} from "@/lib/prioritize";

export function PrioritizePage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const { data: projects } = useProjects();
  const { data: areas } = useAreas();
  const [searchParams, setSearchParams] = useSearchParams();
  const popover = useTaskPopover();

  const projectsParam = searchParams.get("projects") ?? "";
  const areasParam = searchParams.get("areas") ?? "";
  const selectedProjectIds = useMemo(
    () => projectsParam.split(",").filter(Boolean),
    [projectsParam],
  );
  const selectedAreaIds = useMemo(
    () => areasParam.split(",").filter(Boolean),
    [areasParam],
  );

  const setProjectIds = useCallback(
    (ids: string[]) =>
      setSearchParams((p) => {
        if (ids.length > 0) p.set("projects", ids.join(","));
        else p.delete("projects");
        return p;
      }),
    [setSearchParams],
  );

  const setAreaIds = useCallback(
    (ids: string[]) =>
      setSearchParams((p) => {
        if (ids.length > 0) p.set("areas", ids.join(","));
        else p.delete("areas");
        return p;
      }),
    [setSearchParams],
  );

  const [hoveredPoint, setHoveredPoint] = useState<MatrixPoint | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

  const projectLookup = useMemo(() => {
    const map = new Map<string, Project>();
    if (projects) {
      for (const p of projects) map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const points = useMemo(
    () => (tasks ? computeMatrixPoints(tasks, projectLookup) : []),
    [tasks, projectLookup],
  );

  const nullCount = useMemo(
    () => (tasks ? getNullFieldExclusionCount(tasks) : 0),
    [tasks],
  );

  const insights = useMemo(() => {
    if (!tasks) return null;
    const totalActive = tasks.filter(
      (t) => t.status === "Not Started" || t.status === "In Progress",
    ).length;
    return {
      ...computeMatrixInsights(points, totalActive),
      driftCount: computeDriftCount(tasks),
    };
  }, [tasks, points]);

  const fadedIds = useMemo(() => {
    if (selectedProjectIds.length === 0 && selectedAreaIds.length === 0) {
      return new Set<string>();
    }

    const areaProjectIds = new Set<string>();
    if (selectedAreaIds.length > 0 && projects) {
      for (const project of projects) {
        if (project.areaIds.some((aid) => selectedAreaIds.includes(aid))) {
          areaProjectIds.add(project.id);
        }
      }
    }

    const matchingProjectIds = new Set([...selectedProjectIds, ...areaProjectIds]);

    const faded = new Set<string>();
    for (const point of points) {
      const matches =
        matchingProjectIds.size === 0 ||
        point.projectIds.some((pid) => matchingProjectIds.has(pid));
      if (!matches) faded.add(point.id);
    }
    return faded;
  }, [points, selectedProjectIds, selectedAreaIds, projects]);

  const handleDotHover = useCallback(
    (point: MatrixPoint | null, rect: DOMRect | null) => {
      setHoveredPoint(point);
      setHoveredRect(rect);
    },
    [],
  );

  const handleDotClick = useCallback((point: MatrixPoint, rect: DOMRect) => {
    popover.open(matrixPointToSummary(point), rect);
  }, [popover.open]);

  if (isLoading) return <LoadingState variant="page" />;
  if (isError) return <ErrorFallback message="Failed to load tasks" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-[590] text-foreground tracking-[-0.24px]">Prioritize</h2>
        <MatrixFilters
          projects={projects ?? []}
          areas={areas ?? []}
          selectedProjectIds={selectedProjectIds}
          selectedAreaIds={selectedAreaIds}
          onProjectChange={setProjectIds}
          onAreaChange={setAreaIds}
        />
      </div>

      {insights && <MatrixInsights insights={insights} />}

      <NullValueCallout count={nullCount} />

      <ChartContainer
        title="Eisenhower Matrix"
        description="Tasks positioned by urgency and importance"
      >
        {points.length === 0 ? (
          <EmptyState message="No tasks with urgency and importance set" />
        ) : (
          <EisenhowerMatrix
            points={points}
            fadedIds={fadedIds}
            hoveredId={hoveredPoint?.id ?? null}
            selectedId={popover.selectedTask?.id ?? null}
            onDotHover={handleDotHover}
            onDotClick={handleDotClick}
          />
        )}
      </ChartContainer>

      {hoveredPoint && hoveredRect && !popover.selectedTask && (
        <MatrixTooltip point={hoveredPoint} anchorRect={hoveredRect} />
      )}

      {popover.selectedTask && popover.anchorRect && (
        <TaskDetailPopover
          task={popover.selectedTask}
          anchorRect={popover.anchorRect}
          onClose={popover.close}
          onViewNetwork={popover.openNetwork}
        />
      )}

      <NetworkDialog
        taskId={popover.networkTaskId}
        taskName={popover.networkTaskName}
        onClose={popover.closeNetwork}
      />
    </div>
  );
}
