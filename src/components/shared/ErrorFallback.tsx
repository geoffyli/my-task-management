import { AlertCircle } from "lucide-react";

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({ message = "Failed to load data", onRetry }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Retry
        </button>
      )}
    </div>
  );
}
