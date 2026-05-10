import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 animate-[fade-in_200ms_ease-out]"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="relative max-h-[85vh] overflow-y-auto rounded-t-xl bg-surface-elevated pb-[env(safe-area-inset-bottom)] animate-[slide-up_200ms_ease-out]"
      >
        <div className="sticky top-0 z-10 flex flex-col items-center bg-surface-elevated pt-3 pb-2">
          <div className="h-1 w-8 rounded-full bg-foreground-quaternary" />
          {title && (
            <h3 className="mt-3 text-[14px] font-[510] text-foreground">{title}</h3>
          )}
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
