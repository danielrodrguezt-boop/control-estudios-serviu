import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="grid gap-4">
      <Card><CardContent><p className="text-sm text-muted-foreground">Cargando tablero ejecutivo...</p></CardContent></Card>
      <div className="grid metric-grid gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
