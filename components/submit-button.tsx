"use client";

import type React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending || disabled}>{pending ? "Guardando..." : children}</Button>;
}
