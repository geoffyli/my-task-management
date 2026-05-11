import { useEffect, useRef, useState, useCallback } from "react";
import { getStoredToken } from "@/lib/auth";

export interface NetworkNode {
  id: string;
  label: string;
  fullName: string;
  status: string;
  level: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: "dependency" | "related";
}

interface UseTaskNetworkResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  status: "idle" | "loading" | "done" | "error";
  error: string | null;
}

export function useTaskNetwork(taskId: string | null): UseTaskNetworkResult {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    if (!taskId) {
      reset();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setNodes([]);
    setEdges([]);
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const token = getStoredToken();
        const res = await fetch(`/api/tasks/${taskId}/network`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          let currentData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ")) {
              currentData = line.slice(6);
            } else if (line === "") {
              if (currentEvent && currentData) {
                handleSSEEvent(currentEvent, currentData);
              }
              currentEvent = "";
              currentData = "";
            }
          }
        }

        if (!controller.signal.aborted) {
          setStatus((prev) => prev === "error" ? "error" : "done");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
      }
    })();

    function handleSSEEvent(event: string, data: string) {
      if (event === "level") {
        const parsed = JSON.parse(data) as { nodes: NetworkNode[]; edges: NetworkEdge[]; level: number };
        setNodes((prev) => [...prev, ...parsed.nodes]);
        setEdges((prev) => [...prev, ...parsed.edges]);
      } else if (event === "done") {
        setStatus("done");
      } else if (event === "error") {
        const parsed = JSON.parse(data) as { error: string };
        setError(parsed.error);
        setStatus("error");
      }
    }

    return () => {
      controller.abort();
    };
  }, [taskId, reset]);

  return { nodes, edges, status, error };
}
