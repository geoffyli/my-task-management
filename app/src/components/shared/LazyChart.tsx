import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { Skeleton } from "./Skeleton";

interface LazyChartProps {
  children: ReactNode;
  height?: string;
}

export function LazyChart({ children, height }: LazyChartProps) {
  const { ref, isInView } = useInView({ rootMargin: "200px" });

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {isInView ? children : <Skeleton variant="chart" />}
    </div>
  );
}
