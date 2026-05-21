import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-9 rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring", props.className)} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-24 rounded-md border border-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring", props.className)} {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-9 rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring", props.className)} {...props} />;
}
