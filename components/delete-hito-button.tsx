"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteHitoButton() {
  return (
    <Button
      variant="ghost"
      className="h-8 w-8 px-0"
      title="Eliminar"
      onClick={(event) => {
        if (!window.confirm("¿Eliminar este hito? Esta acción no se puede deshacer.")) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
