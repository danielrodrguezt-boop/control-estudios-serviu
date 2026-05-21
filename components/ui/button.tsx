import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border border-border bg-white hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className
      )}
      {...props}
    />
  );
}
