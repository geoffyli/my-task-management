import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-surface-card text-foreground border border-border rounded-[6px] px-3.5 py-3 text-[14px] font-normal placeholder:text-foreground-quaternary transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
