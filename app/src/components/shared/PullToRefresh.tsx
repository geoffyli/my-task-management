import { useState, useRef, useCallback, type ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 60;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0]!.clientY;
      pullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current) return;
    const diff = e.touches[0]!.clientY - startY.current;
    if (diff > 0) {
      const distance = Math.min(diff * 0.5, THRESHOLD * 1.5);
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pullDistanceRef.current >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.5);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [onRefresh]);

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center text-foreground-tertiary transition-[height] duration-150"
          style={{ height: pullDistance }}
        >
          {refreshing ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground-quaternary border-t-accent" />
          ) : (
            <div
              className="h-5 w-5 rounded-full border-2 border-foreground-quaternary transition-transform"
              style={{
                transform: `rotate(${(pullDistance / THRESHOLD) * 360}deg)`,
                opacity: pullDistance / THRESHOLD,
              }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}
