import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({ message = "Failed to load data", onRetry }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <AlertCircle size={28} strokeWidth={1.5} className="text-[#dc2626]" />
      <p className="text-[13px] font-[510] text-foreground-tertiary">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
