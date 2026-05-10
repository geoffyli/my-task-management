import { cn } from "@/lib/utils";

type SkeletonVariant = "card" | "chart" | "list" | "text" | "stats-row";

interface SkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-shimmer rounded-[6px] bg-surface-elevated", className)} />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[8px] border border-border-subtle bg-surface-panel p-4 space-y-3">
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className="h-7 w-16" />
      <SkeletonBlock className="h-2.5 w-24" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-[8px] border border-border-subtle bg-surface-panel p-5 space-y-4">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-[200px] md:h-[280px] w-full" />
    </div>
  );
}

function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <SkeletonBlock className="h-4 w-4 rounded-sm" />
      <SkeletonBlock className="h-3.5 flex-1 max-w-[200px]" />
      <SkeletonBlock className="h-3 w-12 ml-auto" />
    </div>
  );
}

function SkeletonText() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-3/4" />
      <SkeletonBlock className="h-3 w-1/2" />
    </div>
  );
}

function SkeletonStatsRow({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function Skeleton({ variant = "card", count = 1, className }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "stats-row") return <SkeletonStatsRow count={count} />;

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((i) => {
        switch (variant) {
          case "card": return <SkeletonCard key={i} />;
          case "chart": return <SkeletonChart key={i} />;
          case "list": return <SkeletonListItem key={i} />;
          case "text": return <SkeletonText key={i} />;
          default: return <SkeletonCard key={i} />;
        }
      })}
    </div>
  );
}
