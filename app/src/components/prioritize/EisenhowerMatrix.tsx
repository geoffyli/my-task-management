import { useRef, useState, useEffect, useCallback } from "react";
import type { MatrixPoint } from "@/lib/prioritize";
import { MatrixDot } from "./MatrixDot";

interface Props {
  points: MatrixPoint[];
  fadedIds: Set<string>;
  hoveredId: string | null;
  selectedId: string | null;
  onDotHover: (point: MatrixPoint | null, rect: DOMRect | null) => void;
  onDotClick: (point: MatrixPoint, rect: DOMRect) => void;
}

const PADDING = 48;
const QUADRANT_LABELS = [
  { label: "Schedule", x: 0.25, y: 0.85 },
  { label: "Do First", x: 0.75, y: 0.85 },
  { label: "Eliminate", x: 0.25, y: 0.15 },
  { label: "Delegate", x: 0.75, y: 0.15 },
];

export function EisenhowerMatrix({
  points,
  fadedIds,
  hoveredId,
  selectedId,
  onDotHover,
  onDotClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => setSize(Math.max(400, width)));
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  const innerSize = size - PADDING * 2;

  const handleDotLeave = useCallback(() => onDotHover(null, null), [onDotHover]);

  const mid = PADDING + innerSize / 2;

  return (
    <div ref={containerRef} className="mx-auto w-full" style={{ aspectRatio: "1", maxWidth: 600 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        <text
          x={size / 2}
          y={size - 8}
          textAnchor="middle"
          style={{ fontSize: 11, fontWeight: 510, fill: "#8a8f98" }}
        >
          Urgency →
        </text>
        <text
          x={14}
          y={size / 2}
          textAnchor="middle"
          transform={`rotate(-90, 14, ${size / 2})`}
          style={{ fontSize: 11, fontWeight: 510, fill: "#8a8f98" }}
        >
          Importance →
        </text>

        <line
          x1={mid}
          y1={PADDING}
          x2={mid}
          y2={size - PADDING}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="4 6"
          strokeWidth={1}
        />
        <line
          x1={PADDING}
          y1={mid}
          x2={size - PADDING}
          y2={mid}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="4 6"
          strokeWidth={1}
        />

        <rect
          x={PADDING}
          y={PADDING}
          width={innerSize}
          height={innerSize}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />

        {QUADRANT_LABELS.map(({ label, x, y }) => (
          <text
            key={label}
            x={PADDING + x * innerSize}
            y={PADDING + (1 - y) * innerSize}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 12, fontWeight: 510, fill: "rgba(255,255,255,0.15)" }}
          >
            {label}
          </text>
        ))}

        <g transform={`translate(${PADDING}, ${PADDING})`}>
          {points.map((point) => (
            <MatrixDot
              key={point.id}
              point={point}
              size={innerSize}
              isFaded={fadedIds.has(point.id)}
              isHovered={hoveredId === point.id}
              isSelected={selectedId === point.id}
              onMouseEnter={onDotHover}
              onMouseLeave={handleDotLeave}
              onClick={onDotClick}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
