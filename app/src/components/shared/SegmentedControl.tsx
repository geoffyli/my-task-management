import { cn } from "@/lib/utils";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex gap-0.5 rounded-[8px] bg-surface-input p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-[12px] font-[510] transition-colors duration-150",
            value === opt.value
              ? "bg-accent text-accent-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
