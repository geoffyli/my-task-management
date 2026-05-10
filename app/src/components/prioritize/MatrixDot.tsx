import { memo, useRef } from "react";
import type { MatrixPoint } from "@/lib/prioritize";
import { STATUS_COLORS } from "@/lib/constants";

interface Props {
  point: MatrixPoint;
  size: number;
  isFaded: boolean;
  isHovered: boolean;
  isSelected: boolean;
  onMouseEnter: (point: MatrixPoint | null, rect: DOMRect | null) => void;
  onMouseLeave: () => void;
  onClick: (point: MatrixPoint, rect: DOMRect) => void;
}

export const MatrixDot = memo(function MatrixDot({
  point,
  size,
  isFaded,
  isHovered,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: Props) {
  const ref = useRef<SVGCircleElement>(null);

  const cx = point.x * size;
  const cy = (1 - point.y) * size;
  const fill = STATUS_COLORS[point.status];

  return (
    <circle
      ref={ref}
      cx={cx}
      cy={cy}
      r={point.radius}
      fill={fill}
      opacity={isFaded ? 0.1 : 0.85}
      stroke={isSelected ? "var(--color-foreground)" : isHovered ? "var(--color-foreground-tertiary)" : "none"}
      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
      className="transition-opacity duration-200 cursor-pointer"
      onMouseEnter={() => {
        if (ref.current) onMouseEnter(point, ref.current.getBoundingClientRect());
      }}
      onMouseLeave={onMouseLeave}
      onClick={() => {
        if (ref.current) onClick(point, ref.current.getBoundingClientRect());
      }}
    />
  );
});
