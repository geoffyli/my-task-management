import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

export function MultiSelect({ options, selected, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-[6px] border border-border px-3 py-1.5 text-[12px] font-[510] transition-colors",
          selected.length > 0
            ? "bg-[rgba(255,255,255,0.06)] text-foreground"
            : "text-foreground-tertiary hover:bg-[rgba(255,255,255,0.03)]",
        )}
      >
        {selected.length > 0 ? `${selected.length} selected` : placeholder}
        <ChevronDown size={12} strokeWidth={1.5} />
      </button>

      {selected.length > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange([]); }}
          className="ml-1 inline-flex items-center rounded-full p-0.5 text-foreground-quaternary hover:text-foreground-secondary"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      )}

      {open && (
        <div className="absolute top-full right-0 z-40 mt-1 w-56 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#191a1b] p-2 shadow-lg">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="mb-2 w-full rounded-[4px] border border-border bg-transparent px-2 py-1 text-[12px] text-foreground placeholder:text-foreground-quaternary outline-none"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1 text-[12px] text-foreground-secondary hover:bg-[rgba(255,255,255,0.04)]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggle(option.value)}
                  className="h-3 w-3 rounded border-border accent-[#5e6ad2]"
                />
                <span className="truncate">{option.label}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-1 text-[11px] text-foreground-quaternary">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
