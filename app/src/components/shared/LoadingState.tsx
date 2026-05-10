import { Skeleton } from "./Skeleton";

type LoadingVariant = "page" | "chart" | "list" | "stats";

interface LoadingStateProps {
  message?: string;
  variant?: LoadingVariant;
}

export function LoadingState({ message, variant }: LoadingStateProps) {
  if (variant === "stats") return <Skeleton variant="stats-row" count={5} />;
  if (variant === "chart") return <Skeleton variant="chart" />;
  if (variant === "list") return <Skeleton variant="list" count={8} />;

  if (variant === "page") {
    return (
      <div className="space-y-6">
        <Skeleton variant="stats-row" count={5} />
        <Skeleton variant="chart" />
        <Skeleton variant="list" count={5} />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-foreground-tertiary text-[13px] font-[510]">
      {message ?? "Loading..."}
    </div>
  );
}
