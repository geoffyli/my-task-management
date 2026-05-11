export function NetworkLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-[8px] border border-border bg-surface-elevated/90 backdrop-blur-sm px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <svg width="24" height="8" className="shrink-0">
          <line x1="0" y1="4" x2="18" y2="4" stroke="currentColor" strokeWidth="1.5" className="text-foreground-secondary" />
          <polygon points="18,1 24,4 18,7" fill="currentColor" className="text-foreground-secondary" />
        </svg>
        <span className="text-[11px] text-foreground-tertiary">depends on</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="24" height="8" className="shrink-0">
          <line x1="0" y1="4" x2="24" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" className="text-foreground-quaternary" />
        </svg>
        <span className="text-[11px] text-foreground-tertiary">related</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-[4px] border-2 border-accent shrink-0" />
        <span className="text-[11px] text-foreground-tertiary">selected task</span>
      </div>
    </div>
  );
}
