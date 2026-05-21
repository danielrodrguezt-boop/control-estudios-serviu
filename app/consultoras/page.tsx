import { Download } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { avanceFinancieroProyecto, avanceFisicoProyecto, generarAlertasCalculadas, nivelRiesgoOperativo } from "@/lib/business/rules";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConsultorasPage() {
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { contrato: true, garantia: true, hitos: true } });
  const grupos = new Map<string, typeof proyectos>();
  proyectos.forEach((p) => {
    const key = p.contrato?.nombreConsultora ?? "Sin consultora";
    grupos.set(key, [...(grupos.get(key) ?? []), p]);
  });
  const filas = [...grupos.entries()].map(([consultora, items]) => {
    const alertas = items.flatMap((p) => generarAlertasCalculadas(p));
    const riesgoPromedio = promedio(items.map((p) => puntajeRiesgo(nivelRiesgoOperativo(p))));
    return {
      consultora,
      proyectos: items.length,
      montoVigente: items.reduce((sum, p) => sum + (p.contrato?.montoVigente ?? 0), 0),
      avanceFisico: promedio(items.map((p) => avanceFisicoProyecto(p.hitos))),
      avanceFinanciero: promedio(items.map((p) => avanceFinancieroProyecto(p.hitos, p.contrato))),
      atrasosConsultora: alertas.filter((a) => a.responsable === "Consultora").length,
      alertas: alertas.length,
      riesgoPromedio,
      garantias: items.filter((p) => p.garantia).length
    };
  }).sort((a, b) => b.alertas - a.alertas || b.montoVigente - a.montoVigente);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Ranking de desempeno por proveedor</p>
          <h2 className="text-2xl font-bold">Dashboard consultoras</h2>
        </div>
        <a href="/api/reportes/excel/consultoras"><Button variant="outline"><Download className="h-4 w-4" /> Descargar Excel</Button></a>
      </header>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-border bg-muted text-left">
              <tr>
                <th className="px-4 py-3">Consultora</th>
                <th className="px-4 py-3">Proyectos</th>
                <th className="px-4 py-3">Monto vigente</th>
                <th className="px-4 py-3">Avance fisico promedio</th>
                <th className="px-4 py-3">Avance financiero promedio</th>
                <th className="px-4 py-3">Atrasos consultora</th>
                <th className="px-4 py-3">Alertas activas</th>
                <th className="px-4 py-3">Riesgo promedio</th>
                <th className="px-4 py-3">Garantias</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.consultora} className="border-b border-border hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{fila.consultora}</td>
                  <td className="px-4 py-3">{fila.proyectos}</td>
                  <td className="px-4 py-3">{formatCurrency(fila.montoVigente)}</td>
                  <td className="px-4 py-3 w-40"><ProgressBar value={fila.avanceFisico} /></td>
                  <td className="px-4 py-3 w-40"><ProgressBar value={fila.avanceFinanciero} /></td>
                  <td className="px-4 py-3">{fila.atrasosConsultora}</td>
                  <td className="px-4 py-3">{fila.alertas}</td>
                  <td className="px-4 py-3">{fila.riesgoPromedio.toFixed(1)}</td>
                  <td className="px-4 py-3">{fila.garantias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function promedio(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function puntajeRiesgo(riesgo: string) {
  if (riesgo === "ALTO") return 3;
  if (riesgo === "MEDIO") return 2;
  return 1;
}
