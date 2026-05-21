import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { detectarAnomalias } from "@/lib/business/rules";

export default async function AnomaliasPage() {
  const proyectos = await prisma.proyectoEstudio.findMany({
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
    orderBy: { updatedAt: "desc" }
  });
  const filas = proyectos.flatMap((proyecto) => detectarAnomalias(proyecto).map((anomalia) => ({ proyecto, anomalia })));

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Control de integridad de datos y gestion</p>
          <h2 className="text-2xl font-bold">Anomalias</h2>
        </div>
        <div className="flex gap-2">
          <a href="/api/reportes/excel/anomalias"><Button variant="outline"><Download className="h-4 w-4" /> Descargar Excel</Button></a>
          <a href="/api/reportes/word/anomalias"><Button variant="outline">Word criticas</Button></a>
        </div>
      </header>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-border bg-muted text-left">
              <tr>
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Codigo BIP</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Severidad</th>
                <th className="px-4 py-3">Mensaje</th>
                <th className="px-4 py-3">Accion sugerida</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ proyecto, anomalia }, index) => (
                <tr key={`${proyecto.id}-${anomalia.tipo}-${index}`} className="border-b border-border hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/proyectos/${proyecto.id}`} className="font-medium text-primary">{proyecto.nombre}</Link></td>
                  <td className="px-4 py-3">{proyecto.codigoBip}</td>
                  <td className="px-4 py-3">{anomalia.tipo}</td>
                  <td className="px-4 py-3"><Badge tone={anomalia.severidad === "CRITICA" || anomalia.severidad === "ALTA" ? "danger" : "warning"}>{anomalia.severidad}</Badge></td>
                  <td className="px-4 py-3">{anomalia.mensaje}</td>
                  <td className="px-4 py-3">{anomalia.accionSugerida}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filas.length === 0 && <p className="p-4 text-sm text-muted-foreground">No se detectaron anomalias en la cartera.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
