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
    "bg-[rgba(255,255,255,0.02)] border border-border-solid text-foreground-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground",
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover",
  subtle:
    "bg-[rgba(255,255,255,0.04)] text-foreground-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-foreground",
  pill:
    "bg-transparent border border-border-solid text-foreground-secondary rounded-[9999px] hover:text-foreground",
  icon:
    "bg-[rgba(255,255,255,0.03)] border border-border text-foreground rounded-full hover:bg-[rgba(255,255,255,0.06)]",
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
