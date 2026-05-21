import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { avanceFinancieroProyecto, avanceFisicoProyecto, daysUntil, estadoGarantiaCalculado, garantiaEvaluada, generarAlertasCalculadas, nivelRiesgoOperativo } from "@/lib/business/rules";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CompararPage({ searchParams }: { searchParams?: { ids?: string | string[] } }) {
  const rawIds = Array.isArray(searchParams?.ids) ? searchParams?.ids.join(",") : searchParams?.ids ?? "";
  const ids = rawIds.split(",").map((id) => Number(id)).filter(Boolean);
  const proyectos = await prisma.proyectoEstudio.findMany({
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
    orderBy: { nombre: "asc" }
  });
  const seleccionados = ids.length ? proyectos.filter((p) => ids.includes(p.id)) : proyectos.slice(0, 3);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Analisis comparativo directivo</p>
          <h2 className="text-2xl font-bold">Comparador de proyectos</h2>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reportes/excel/comparativo?ids=${ids.join(",")}`}><Button variant="outline"><Download className="h-4 w-4" /> Excel</Button></a>
          <a href={`/api/reportes/word/comparativo?ids=${ids.join(",")}`}><Button variant="outline">Word</Button></a>
        </div>
      </header>
      <Card>
        <CardHeader><CardTitle>Seleccionar proyectos</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-2 md:grid-cols-3">
            {proyectos.map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <input name="ids" type="checkbox" value={p.id} defaultChecked={seleccionados.some((s) => s.id === p.id)} />
                <span>{p.codigoBip} · {p.nombre}</span>
              </label>
            ))}
            <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground md:col-span-3">Comparar seleccionados</button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="border-b border-border bg-muted text-left">
              <tr>
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Consultora</th>
                <th className="px-4 py-3">Comuna</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Monto vigente</th>
                <th className="px-4 py-3">Avance fisico</th>
                <th className="px-4 py-3">Avance financiero</th>
                <th className="px-4 py-3">Riesgo</th>
                <th className="px-4 py-3">Alertas</th>
                <th className="px-4 py-3">Plazo restante</th>
                <th className="px-4 py-3">Garantia</th>
              </tr>
            </thead>
            <tbody>
              {seleccionados.map((p) => {
                const garantia = garantiaEvaluada(p);
                const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia) : null;
                const riesgo = nivelRiesgoOperativo(p);
                return (
                  <tr key={p.id} className="border-b border-border hover:bg-slate-50">
                    <td className="px-4 py-3"><Link href={`/proyectos/${p.id}`} className="font-medium text-primary">{p.nombre}</Link></td>
                    <td className="px-4 py-3">{p.contrato?.nombreConsultora ?? "-"}</td>
                    <td className="px-4 py-3">{p.comuna}</td>
                    <td className="px-4 py-3">{p.tipoEstudio.nombre}</td>
                    <td className="px-4 py-3">{formatCurrency(p.contrato?.montoVigente)}</td>
                    <td className="px-4 py-3 w-36"><ProgressBar value={avanceFisicoProyecto(p.hitos)} /></td>
                    <td className="px-4 py-3 w-36"><ProgressBar value={avanceFinancieroProyecto(p.hitos, p.contrato)} /></td>
                    <td className="px-4 py-3"><Badge tone={riesgo === "ALTO" ? "danger" : riesgo === "MEDIO" ? "warning" : "success"}>{riesgo}</Badge></td>
                    <td className="px-4 py-3">{generarAlertasCalculadas(p).length}</td>
                    <td className="px-4 py-3">{p.contrato ? daysUntil(p.contrato.fechaTerminoVigente) : "-"}</td>
                    <td className="px-4 py-3">{estadoGarantia ?? "Sin garantia"} · {formatDate(garantia?.fechaVencimiento)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
