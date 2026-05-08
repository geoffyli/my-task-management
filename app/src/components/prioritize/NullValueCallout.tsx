import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

interface Props {
  count: number;
}

export function NullValueCallout({ count }: Props) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-[6px] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.05)] px-3 py-2">
      <AlertCircle size={14} strokeWidth={1.5} className="text-[#dc2626] shrink-0" />
      <span className="text-[12px] font-[510] text-foreground-secondary">
        {count} {count === 1 ? "task" : "tasks"} not plotted — missing urgency or importance
      </span>
      <Link
        to="/health"
        className="ml-auto text-[11px] font-[510] text-[#5e6ad2] hover:text-[#7170ff]"
      >
        View in Health →
      </Link>
    </div>
  );
}
