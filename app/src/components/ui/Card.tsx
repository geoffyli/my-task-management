import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated";
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "border border-border",
        variant === "default" && "bg-surface-card rounded-[8px]",
        variant === "elevated" && "bg-interactive-hover rounded-[12px]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-1", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h3 className={cn("text-[14px] font-[510] text-foreground tracking-[-0.01em]", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] font-normal text-foreground-tertiary mt-0.5", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-4", className)} {...props} />;
}
