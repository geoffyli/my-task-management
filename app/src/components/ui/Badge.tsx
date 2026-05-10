import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "success" | "subtle" | "data";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  color?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral:
    "bg-transparent border border-border-solid text-foreground-secondary",
  success:
    "bg-success-light text-foreground",
  subtle:
    "bg-interactive-hover border border-border-subtle text-foreground",
  data: "",
};

export function Badge({ className, variant = "neutral", color, style, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] font-[510] leading-tight",
        variant === "neutral" && "rounded-[9999px]",
        variantStyles[variant],
        className,
      )}
      style={
        variant === "data" && color
          ? { backgroundColor: color, color: "#ffffff", ...style }
          : style
      }
      {...props}
    />
  );
}
