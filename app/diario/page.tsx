import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { detectarAnomalias, estadoContratoCalculado, estadoGarantiaCalculado, garantiaEvaluada, generarAlertasCalculadas, prioridadProyecto } from "@/lib/business/rules";
import { EstadoContrato, EstadoGarantia } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function DiarioPage() {
  const proyectos = await prisma.proyectoEstudio.findMany({
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
    orderBy: { updatedAt: "desc" }
  });
  const priorizados = proyectos.map((p) => ({ proyecto: p, prioridad: prioridadProyecto(p), alertas: generarAlertasCalculadas(p) })).sort((a, b) => b.prioridad.puntaje - a.prioridad.puntaje);
  const garantias = proyectos.filter((p) => {
    const garantia = garantiaEvaluada(p);
    return garantia && [EstadoGarantia.PROXIMA_A_VENCER, EstadoGarantia.VENCIDA].includes(estadoGarantiaCalculado(garantia) as never);
  });
  const contratos = proyectos.filter((p) => p.contrato && [EstadoContrato.PROXIMO_A_VENCER, EstadoContrato.VENCIDO].includes(estadoContratoCalculado(p.contrato) as never));
  const atrasosConsultora = priorizados.filter((p) => p.alertas.some((a) => a.responsable === "Consultora"));
  const revisionesServiu = priorizados.filter((p) => p.alertas.some((a) => a.responsable === "SERVIU"));
  const anomalias = proyectos.flatMap((p) => detectarAnomalias(p).map((a) => ({ proyecto: p, anomalia: a })));

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Vista para abrir cada manana</p>
        <h2 className="text-2xl font-bold">Centro de gestion diaria</h2>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Tareas urgentes hoy" items={priorizados.filter((p) => p.prioridad.puntaje > 0).slice(0, 6).map((p) => ({ href: `/proyectos/${p.proyecto.id}`, title: p.proyecto.nombre, meta: p.prioridad.accionSugerida, tone: p.prioridad.severidad }))} />
        <Widget title="Garantias por gestionar" items={garantias.map((p) => ({ href: `/proyectos/${p.id}`, title: p.nombre, meta: p.garantia?.folio ?? "Sin folio", tone: "ALTA" }))} />
        <Widget title="Contratos proximos a vencer" items={contratos.map((p) => ({ href: `/proyectos/${p.id}`, title: p.nombre, meta: p.contrato?.nombreConsultora ?? "-", tone: "MEDIA" }))} />
        <Widget title="Atrasos consultora" items={atrasosConsultora.map((p) => ({ href: `/proyectos/${p.proyecto.id}`, title: p.proyecto.nombre, meta: `${p.alertas.filter((a) => a.responsable === "Consultora").length} alertas`, tone: "ALTA" }))} />
        <Widget title="Revisiones SERVIU pendientes" items={revisionesServiu.map((p) => ({ href: `/proyectos/${p.proyecto.id}`, title: p.proyecto.nombre, meta: `${p.alertas.filter((a) => a.responsable === "SERVIU").length} alertas`, tone: "MEDIA" }))} />
        <Widget title="Anomalias detectadas" items={anomalias.slice(0, 8).map((a) => ({ href: `/proyectos/${a.proyecto.id}`, title: a.proyecto.nombre, meta: a.anomalia.tipo, tone: a.anomalia.severidad }))} />
      </div>
    </div>
  );
}

function Widget({ title, items }: { title: string; items: { href: string; title: string; meta: string; tone: string }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Sin elementos pendientes.</p>}
        {items.map((item, index) => (
          <Link key={`${item.href}-${index}`} href={item.href} className="rounded-md border border-border p-3 hover:bg-muted">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              <Badge tone={item.tone === "CRITICA" || item.tone === "ALTA" ? "danger" : "warning"}>{item.tone}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
