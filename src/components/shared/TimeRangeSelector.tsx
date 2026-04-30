import { TIME_RANGES, type TimeRange } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-0.5 rounded-[8px] bg-[rgba(255,255,255,0.03)] p-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-[12px] font-[510] transition-colors duration-150",
            value === range.value
              ? "bg-accent text-accent-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
