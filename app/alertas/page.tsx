import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tipoAlertaLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { alertKey, generarAlertasCalculadas } from "@/lib/business/rules";
import { resolverAlerta } from "@/app/actions";

export default async function AlertasPage({
  searchParams
}: {
  searchParams?: { tipo?: string; severidad?: string; comuna?: string; consultora?: string; estado?: string };
}) {
  const filters = searchParams ?? {};
  const [proyectos, alertasPersistidas] = await Promise.all([
    prisma.proyectoEstudio.findMany({
      include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.alerta.findMany({ include: { proyecto: { include: { contrato: true } } }, orderBy: { fechaDeteccion: "desc" } })
  ]);

  const resueltas = new Set(alertasPersistidas.filter((a) => a.resuelta).map((a) => alertKey(a.proyectoId, a.tipo, a.mensaje)));
  const activasCalculadas = proyectos
    .flatMap((proyecto) =>
      generarAlertasCalculadas(proyecto).map((alerta) => ({
        ...alerta,
        proyecto,
        resuelta: false,
        comentarioResolucion: null,
        fechaResolucion: null,
        persistida: false
      }))
    )
    .filter((alerta) => !resueltas.has(alertKey(alerta.proyecto.id, alerta.tipo, alerta.mensaje)));
  const alertasResueltas = alertasPersistidas
    .filter((alerta) => alerta.resuelta)
    .map((alerta) => ({
      tipo: alerta.tipo,
      severidad: alerta.severidad,
      mensaje: alerta.mensaje,
      responsable: "Manual",
      diasAtraso: 0,
      fechaDeteccion: alerta.fechaDeteccion,
      estado: "Resuelta",
      proyecto: alerta.proyecto,
      resuelta: true,
      comentarioResolucion: alerta.comentarioResolucion,
      fechaResolucion: alerta.fechaResolucion,
      persistida: true
    }));
  const alertasBase = filters.estado === "resueltas" ? alertasResueltas : filters.estado === "todas" ? [...activasCalculadas, ...alertasResueltas] : activasCalculadas;
  const alertas = alertasBase
    .filter((alerta) => {
      if (filters.tipo && alerta.tipo !== filters.tipo) return false;
      if (filters.severidad && alerta.severidad !== filters.severidad) return false;
      if (filters.comuna && alerta.proyecto.comuna !== filters.comuna) return false;
      if (filters.consultora && alerta.proyecto.contrato?.nombreConsultora !== filters.consultora) return false;
      return true;
    });

  const tipos = [...new Set([...activasCalculadas, ...alertasResueltas].map((a) => a.tipo))];
  const severidades = [...new Set([...activasCalculadas, ...alertasResueltas].map((a) => a.severidad))];
  const comunas = [...new Set(proyectos.map((p) => p.comuna))];
  const consultoras = [...new Set(proyectos.map((p) => p.contrato?.nombreConsultora).filter((value): value is string => Boolean(value)))];

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Seguimiento consolidado de cartera</p>
        <h2 className="text-2xl font-bold">Alertas operativas</h2>
      </header>

      <Card>
        <CardContent>
          <form className="grid gap-2 md:grid-cols-5">
            <select name="tipo" defaultValue={filters.tipo ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todos los tipos</option>
              {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipoAlertaLabel[tipo] ?? tipo}</option>)}
            </select>
            <select name="severidad" defaultValue={filters.severidad ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todas las severidades</option>
              {severidades.map((severidad) => <option key={severidad} value={severidad}>{severidad}</option>)}
            </select>
            <select name="comuna" defaultValue={filters.comuna ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todas las comunas</option>
              {comunas.map((comuna) => <option key={comuna}>{comuna}</option>)}
            </select>
            <select name="consultora" defaultValue={filters.consultora ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todas las consultoras</option>
              {consultoras.map((consultora) => <option key={consultora}>{consultora}</option>)}
            </select>
            <select name="estado" defaultValue={filters.estado ?? "activas"} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="activas">Activas</option>
              <option value="resueltas">Resueltas</option>
              <option value="todas">Todas</option>
            </select>
            <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground md:col-span-5">Filtrar</button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-b border-border bg-muted text-left">
              <tr>
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Código BIP</th>
                <th className="px-4 py-3">Consultora</th>
                <th className="px-4 py-3">Comuna</th>
                <th className="px-4 py-3">Tipo alerta</th>
                <th className="px-4 py-3">Severidad</th>
                <th className="px-4 py-3">Fecha detección</th>
                <th className="px-4 py-3">Días atraso</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">ResoluciÃ³n</th>
                <th className="px-4 py-3">AcciÃ³n</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((alerta, index) => (
                <tr key={`${alerta.proyecto.id}-${alerta.tipo}-${index}`} className="border-b border-border hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/proyectos/${alerta.proyecto.id}`} className="font-medium text-primary">{alerta.proyecto.nombre}</Link></td>
                  <td className="px-4 py-3">{alerta.proyecto.codigoBip}</td>
                  <td className="px-4 py-3">{alerta.proyecto.contrato?.nombreConsultora ?? "-"}</td>
                  <td className="px-4 py-3">{alerta.proyecto.comuna}</td>
                  <td className="px-4 py-3">{tipoAlertaLabel[alerta.tipo] ?? alerta.tipo}</td>
                  <td className="px-4 py-3"><Badge tone={alerta.severidad === "CRITICA" || alerta.severidad === "ALTA" ? "danger" : "warning"}>{alerta.severidad}</Badge></td>
                  <td className="px-4 py-3">{formatDate(alerta.fechaDeteccion)}</td>
                  <td className="px-4 py-3">{alerta.diasAtraso}</td>
                  <td className="px-4 py-3">{alerta.responsable}</td>
                  <td className="px-4 py-3">{alerta.resuelta ? <Badge tone="success">Resuelta</Badge> : <Badge tone="warning">Activa</Badge>}</td>
                  <td className="px-4 py-3">
                    {alerta.resuelta ? (
                      <div className="max-w-xs text-xs text-muted-foreground">
                        <p>{formatDate(alerta.fechaResolucion)}</p>
                        <p>{alerta.comentarioResolucion ?? "Sin comentario"}</p>
                      </div>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {!alerta.resuelta ? (
                      <form action={resolverAlerta.bind(null, alerta.proyecto.id, alerta.tipo, alerta.severidad, alerta.mensaje)} className="flex min-w-72 gap-2">
                        <input name="comentarioResolucion" placeholder="Comentario opcional" className="h-8 flex-1 rounded-md border border-input px-2 text-xs" />
                        <button className="h-8 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted">Resolver</button>
                      </form>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {alertas.length === 0 && <p className="p-4 text-sm text-muted-foreground">No hay alertas operativas para los filtros seleccionados.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
