import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { NetworkNode, NetworkEdge } from "@/hooks/useTaskNetwork";
import { NetworkNodeComponent, type NetworkNodeData } from "./NetworkNode";
import { NetworkLegend } from "./NetworkLegend";
import { NodeTooltip } from "./NodeTooltip";

const nodeTypes = { network: NetworkNodeComponent };

interface Props {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  focalId: string;
  status: "idle" | "loading" | "done" | "error";
}

const H_SPACING = 260;
const V_SPACING = 70;
const V_SPACING_MOBILE = 100;
const H_SPACING_MOBILE = 180;

function computeLayout(nodes: NetworkNode[], isMobile: boolean): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const byLevel = new Map<number, NetworkNode[]>();

  for (const node of nodes) {
    const group = byLevel.get(node.level) ?? [];
    group.push(node);
    byLevel.set(node.level, group);
  }

  for (const [level, group] of byLevel) {
    const count = group.length;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2);
      if (isMobile) {
        positions.set(group[i]!.id, {
          x: offset * H_SPACING_MOBILE,
          y: level * V_SPACING_MOBILE,
        });
      } else {
        positions.set(group[i]!.id, {
          x: level * H_SPACING,
          y: offset * V_SPACING,
        });
      }
    }
  }

  return positions;
}

function NetworkGraphInner({ nodes, edges, focalId, status }: Props) {
  const { isMobile } = useBreakpoint();
  const { fitView } = useReactFlow();
  const [tooltip, setTooltip] = useState<{
    nodeId: string;
    fullName: string;
    status: string;
    position: { x: number; y: number };
  } | null>(null);

  const positions = useMemo(() => computeLayout(nodes, isMobile), [nodes, isMobile]);

  const flowNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        return {
          id: n.id,
          type: "network",
          position: pos,
          data: {
            label: n.label,
            fullName: n.fullName,
            status: n.status,
            isFocal: n.id === focalId,
          } satisfies NetworkNodeData,
        };
      }),
    [nodes, positions, focalId],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "default",
        animated: false,
        style: e.type === "related"
          ? { strokeDasharray: "5 3", stroke: "var(--color-foreground-quaternary, #9ca3af)", strokeWidth: 1.2 }
          : { stroke: "var(--color-foreground-secondary, #6b7280)", strokeWidth: 1.5 },
        markerEnd: e.type === "dependency"
          ? { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "var(--color-foreground-secondary, #6b7280)" }
          : undefined,
      })),
    [edges],
  );

  useEffect(() => {
    if (flowNodes.length > 0) {
      const timer = setTimeout(() => fitView({ duration: 300, padding: 0.2 }), 50);
      return () => clearTimeout(timer);
    }
  }, [flowNodes.length, fitView]);

  const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
    const data = node.data as unknown as NetworkNodeData;
    const mouseEvent = event as unknown as { clientX: number; clientY: number };
    setTooltip({
      nodeId: node.id,
      fullName: data.fullName,
      status: data.status,
      position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
      >
        <Background gap={20} size={1} className="!bg-surface-panel" />
      </ReactFlow>

      <NetworkLegend />

      {tooltip && (
        <NodeTooltip
          nodeId={tooltip.nodeId}
          fullName={tooltip.fullName}
          status={tooltip.status}
          position={tooltip.position}
          onClose={() => setTooltip(null)}
        />
      )}

      {status === "loading" && nodes.length > 0 && (
        <div className="absolute top-4 right-4 rounded-[6px] bg-surface-elevated/90 border border-border px-3 py-1.5 text-[11px] text-foreground-tertiary">
          Loading more...
        </div>
      )}
    </div>
  );
}

export function NetworkGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <NetworkGraphInner {...props} />
    </ReactFlowProvider>
  );
}
