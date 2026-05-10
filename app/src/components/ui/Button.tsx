import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "ghost" | "primary" | "subtle" | "pill" | "icon";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  ghost:
    "bg-surface-card border border-border-solid text-foreground-secondary hover:bg-interactive-hover hover:text-foreground",
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover",
  subtle:
    "bg-interactive-hover text-foreground-secondary hover:bg-interactive-active hover:text-foreground",
  pill:
    "bg-transparent border border-border-solid text-foreground-secondary rounded-[9999px] hover:text-foreground",
  icon:
    "bg-surface-input border border-border text-foreground rounded-full hover:bg-interactive-active",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-[12px]",
  md: "px-4 py-2 text-[13px]",
  lg: "px-5 py-2.5 text-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-[510] rounded-[6px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none",
          variantStyles[variant],
          variant !== "pill" && variant !== "icon" && sizeStyles[size],
          variant === "icon" && "p-2",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
