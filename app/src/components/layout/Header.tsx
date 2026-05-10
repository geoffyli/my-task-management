import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function Header({ onMenuClick, showMenu }: HeaderProps) {
  return (
    <header className="flex items-center border-b border-border-subtle bg-surface-panel px-4 py-3 md:px-8 pt-[max(12px,env(safe-area-inset-top))]">
      {showMenu && (
        <button
          onClick={onMenuClick}
          className="mr-3 flex h-9 w-9 items-center justify-center rounded-[6px] text-foreground-secondary hover:bg-surface-hover md:hidden"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      )}
      <p className="text-[13px] font-[510] text-foreground-tertiary">
        Notion task analytics
      </p>
    </header>
  );
}
