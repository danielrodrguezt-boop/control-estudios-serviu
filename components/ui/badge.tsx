import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warning" | "danger" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        tone === "default" && "bg-accent text-accent-foreground",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "danger" && "bg-red-100 text-red-800",
        tone === "muted" && "bg-muted text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
