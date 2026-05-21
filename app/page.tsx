import Link from "next/link";

import type React from "react";
import { AlertTriangle, Banknote, CheckCircle2, Download, MapPinned, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarSimple, LineSimple, PieSimple } from "@/components/dashboard-charts";
import { ProgressBar } from "@/components/progress-bar";
import { estadoContratoLabel, estadoGarantiaLabel, estadoProyectoLabel } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  avanceFinancieroProyecto,
  avanceFisicoProyecto,
  daysUntil,
  estadoContratoCalculado,
  estadoGarantiaCalculado,
  garantiaEvaluada,
  generarAlertasCalculadas,
  nivelRiesgoOperativo,
  prioridadProyecto
} from "@/lib/business/rules";
import { EstadoContrato, EstadoGarantia, TipoAlerta } from "@/lib/enums";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SearchParams = {
  comuna?: string;
  consultora?: string;
  tipo?: string;
  estado?: string;
  riesgo?: string;
  critico?: string;
  sort?: string;
  dir?: string;
};

export default async function Dashboard({ searchParams }: { searchParams?: SearchParams }) {
  const filters = searchParams ?? {};
  const proyectos = await prisma.proyectoEstudio.findMany({
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
    orderBy: { updatedAt: "desc" }
  });

  const base = proyectos.map((proyecto) => {
    const alertas = generarAlertasCalculadas(proyecto);
    const riesgo = nivelRiesgoOperativo(proyecto);
    const avanceFisico = avanceFisicoProyecto(proyecto.hitos);
    const avanceFinanciero = avanceFinancieroProyecto(proyecto.hitos, proyecto.contrato);
    const estadoContrato = proyecto.contrato ? estadoContratoCalculado(proyecto.contrato) : null;
    const garantia = garantiaEvaluada(proyecto);
    const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia) : null;
    const prioridad = prioridadProyecto(proyecto);
    return { proyecto, alertas, riesgo, avanceFisico, avanceFinanciero, estadoContrato, garantia, estadoGarantia, prioridad };
  });

  const resumenes = base.filter((r) => {
    if (filters.comuna && r.proyecto.comuna !== filters.comuna) return false;
    if (filters.consultora && r.proyecto.contrato?.nombreConsultora !== filters.consultora) return false;
    if (filters.tipo && String(r.proyecto.tipoEstudioId) !== filters.tipo) return false;
    if (filters.estado && r.proyecto.estado !== filters.estado) return false;
    if (filters.riesgo && r.riesgo !== filters.riesgo) return false;
    if (filters.critico === "si" && !r.proyecto.esCriticoManual) return false;
    if (filters.critico === "no" && r.proyecto.esCriticoManual) return false;
    return true;
  });

  const alertas = resumenes.flatMap((r) => r.alertas.map((alerta) => ({ ...alerta, proyecto: r.proyecto })));
  const montoContratado = resumenes.reduce((sum, r) => sum + (r.proyecto.contrato?.montoOriginal ?? 0), 0);
  const montoVigente = resumenes.reduce((sum, r) => sum + (r.proyecto.contrato?.montoVigente ?? 0), 0);
  const montoPagado = resumenes.flatMap((r) => r.proyecto.hitos).reduce((sum, h) => sum + h.montoPagado, 0);
  const avanceFisicoPromedio = promedio(resumenes.map((r) => r.avanceFisico));
  const avanceFinancieroPromedio = promedio(resumenes.map((r) => r.avanceFinanciero));

  const proyectosPriorizados = resumenes
    .filter((r) => r.prioridad.puntaje > 0)
    .sort((a, b) => b.prioridad.puntaje - a.prioridad.puntaje)
    .slice(0, 8);

  const consultorasActivas = new Set(resumenes.map((r) => r.proyecto.contrato?.nombreConsultora).filter(Boolean)).size;
  const comunasActivas = new Set(resumenes.map((r) => r.proyecto.comuna)).size;
  const contratos30Dias = resumenes.filter((r) => r.proyecto.contrato && daysUntil(r.proyecto.contrato.fechaTerminoVigente) <= 30 && daysUntil(r.proyecto.contrato.fechaTerminoVigente) >= 0).length;
  const consultorasConAtrasos = topConsultorasAtrasos(alertas);

  const kpisOperacion = [
    ["Total proyectos", resumenes.length],
    ["CrÃƒÂ­ticos manuales", resumenes.filter((r) => r.proyecto.esCriticoManual).length],
    ["Riesgo alto", resumenes.filter((r) => r.riesgo === "ALTO").length],
    ["Riesgo medio", resumenes.filter((r) => r.riesgo === "MEDIO").length],
    ["Riesgo bajo", resumenes.filter((r) => r.riesgo === "BAJO").length],
    ["Atrasos consultora", alertas.filter((a) => a.tipo === TipoAlerta.HITO_ATRASADO_CONSULTORA).length],
    ["Atrasos SERVIU", alertas.filter((a) => a.tipo === TipoAlerta.REVISION_SERVIU_ATRASADA).length],
    ["Contratos prÃƒÂ³ximos", resumenes.filter((r) => r.estadoContrato === EstadoContrato.PROXIMO_A_VENCER).length],
    ["Contratos vencidos", resumenes.filter((r) => r.estadoContrato === EstadoContrato.VENCIDO).length],
    ["GarantÃƒÂ­as prÃƒÂ³ximas", resumenes.filter((r) => r.estadoGarantia === EstadoGarantia.PROXIMA_A_VENCER).length],
    ["GarantÃƒÂ­as vencidas", resumenes.filter((r) => r.estadoGarantia === EstadoGarantia.VENCIDA).length]
  ];

  const porRiesgo = ["BAJO", "MEDIO", "ALTO"].map((riesgo) => ({ riesgo, total: resumenes.filter((r) => r.riesgo === riesgo).length }));
  const gastoComuna = agrupar(resumenes, (r) => r.proyecto.comuna, (r) => r.proyecto.contrato?.montoVigente ?? 0, "comuna");
  const gastoConsultora = agrupar(resumenes, (r) => r.proyecto.contrato?.nombreConsultora ?? "Sin consultora", (r) => r.proyecto.contrato?.montoVigente ?? 0, "consultora").sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 6);
  const embudo = ["ADJUDICADO", "EN_EJECUCION", "CON_OBSERVACIONES", "FINALIZADO", "RECEPCIONADO", "CERRADO"].map((estado) => ({ estado: estadoProyectoLabel[estado], total: resumenes.filter((r) => r.proyecto.estado === estado).length }));
  const evolucionAlertas = agrupar(alertas, (a) => formatDate(a.fechaDeteccion), () => 1, "fecha");
  const topConsultoras = topConsultorasRiesgo(resumenes);
  const heatmap = construirHeatmap(resumenes);

  const tabla = ordenar(resumenes, filters.sort, filters.dir);
  const tipos = await prisma.tipoEstudio.findMany({ where: { activo: true } });
  const comunas = [...new Set(proyectos.map((p) => p.comuna))];
  const consultoras = [...new Set(proyectos.map((p) => p.contrato?.nombreConsultora).filter((value): value is string => Boolean(value)))];

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Tablero directivo de cartera</p>
          <h2 className="text-2xl font-bold">Dashboard Ejecutivo Control Estudios SERVIU</h2>
        </div>
        <Link href="/api/reportes/excel/dashboard-ejecutivo">
          <Button variant="outline"><Download className="h-4 w-4" /> Exportar dashboard ejecutivo</Button>
        </Link>
      </header>

      <Card>
        <CardContent>
          <form className="grid gap-2 md:grid-cols-6">
            <SelectFilter name="comuna" value={filters.comuna} all="Todas las comunas" options={comunas.map((v) => [v, v])} />
            <SelectFilter name="consultora" value={filters.consultora} all="Todas las consultoras" options={consultoras.map((v) => [v, v])} />
            <SelectFilter name="tipo" value={filters.tipo} all="Todos los tipos" options={tipos.map((t) => [String(t.id), t.nombre])} />
            <SelectFilter name="estado" value={filters.estado} all="Todos los estados" options={Object.entries(estadoProyectoLabel)} />
            <SelectFilter name="riesgo" value={filters.riesgo} all="Todos los riesgos" options={[["BAJO", "Bajo"], ["MEDIO", "Medio"], ["ALTO", "Alto"]]} />
            <SelectFilter name="critico" value={filters.critico} all="CrÃƒÂ­tico sÃƒÂ­/no" options={[["si", "CrÃƒÂ­tico"], ["no", "No crÃƒÂ­tico"]]} />
            <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground md:col-span-6">Aplicar filtros</button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resumen ejecutivo automÃƒÂ¡tico</CardTitle></CardHeader>
        <CardContent className="text-sm leading-6 text-slate-700">
          Actualmente existen <strong>{resumenes.length}</strong> proyectos en la cartera filtrada. <strong>{resumenes.filter((r) => r.riesgo === "ALTO").length}</strong> presentan riesgo alto. {consultorasConAtrasos.length > 0 ? <><strong>{consultorasConAtrasos.length}</strong> consultoras concentran atrasos operativos. </> : "No hay consultoras con atrasos en el filtro actual. "} <strong>{resumenes.filter((r) => r.estadoGarantia === EstadoGarantia.VENCIDA).length}</strong> garantÃƒÂ­as vencieron. <strong>{contratos30Dias}</strong> contratos vencerÃƒÂ¡n en los prÃƒÂ³ximos 30 dÃƒÂ­as.
        </CardContent>
      </Card>

      <section className="grid metric-grid gap-3">
        {kpisOperacion.map(([title, value]) => <Metric key={title} title={String(title)} value={value} icon={<AlertTriangle />} />)}
        <Metric title="Monto contratado" value={formatCurrency(montoContratado)} icon={<Banknote />} />
        <Metric title="Monto vigente" value={formatCurrency(montoVigente)} icon={<Banknote />} />
        <Metric title="Monto pagado" value={formatCurrency(montoPagado)} icon={<Banknote />} />
        <Metric title="Saldo pendiente" value={formatCurrency(montoVigente - montoPagado)} icon={<Banknote />} />
        <Metric title="Avance financiero promedio" value={`${avanceFinancieroPromedio}%`} icon={<CheckCircle2 />} />
        <Metric title="Avance fÃƒÂ­sico promedio" value={`${avanceFisicoPromedio}%`} icon={<CheckCircle2 />} />
        <Metric title="Consultoras activas" value={consultorasActivas} icon={<Users />} />
        <Metric title="Comunas activas" value={comunasActivas} icon={<MapPinned />} />
        <Metric title="Proyectos con alertas" value={resumenes.filter((r) => r.alertas.length > 0).length} icon={<AlertTriangle />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Mapa de calor operativo por tipo de estudio</CardTitle></CardHeader>
          <CardContent><Heatmap tipos={heatmap.tipos} rows={heatmap.rows} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avance real de cartera</CardTitle></CardHeader>
          <CardContent className="grid gap-5">
            <div><p className="mb-2 text-sm font-medium">Avance fÃƒÂ­sico promedio</p><ProgressBar value={avanceFisicoPromedio} /></div>
            <div><p className="mb-2 text-sm font-medium">Avance financiero promedio</p><ProgressBar value={avanceFinancieroPromedio} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Proyectos por riesgo</CardTitle></CardHeader>
          <CardContent><BarSimple data={porRiesgo} dataKey="total" nameKey="riesgo" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Gasto por comuna</CardTitle></CardHeader>
          <CardContent><BarSimple data={gastoComuna} dataKey="total" nameKey="comuna" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Gasto por consultora</CardTitle></CardHeader>
          <CardContent><BarSimple data={gastoConsultora} dataKey="total" nameKey="consultora" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Embudo de cartera</CardTitle></CardHeader>
          <CardContent><BarSimple data={embudo} dataKey="total" nameKey="estado" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>EvoluciÃƒÂ³n de alertas</CardTitle></CardHeader>
          <CardContent>{evolucionAlertas.length ? <LineSimple data={evolucionAlertas} dataKey="total" nameKey="fecha" /> : <EmptyState text="Sin alertas para graficar." />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>DistribuciÃƒÂ³n territorial</CardTitle></CardHeader>
          <CardContent><PieSimple data={agrupar(resumenes, (r) => r.proyecto.comuna, () => 1, "comuna")} dataKey="total" nameKey="comuna" /></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top consultoras con mayor riesgo</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-muted text-left"><tr><th className="px-4 py-3">Consultora</th><th>Proyectos</th><th>Atrasos</th><th>Riesgo promedio</th><th>Alertas</th></tr></thead>
              <tbody>{topConsultoras.map((c) => <tr key={c.consultora} className="border-b border-border"><td className="px-4 py-3 font-medium">{c.consultora}</td><td>{c.proyectos}</td><td>{c.atrasos}</td><td><Badge tone={tonoRiesgo(c.riesgo)}>{c.riesgo}</Badge></td><td>{c.alertas}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Proyectos que requieren atenciÃƒÂ³n</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {proyectosPriorizados.map((r) => (
              <Link key={r.proyecto.id} href={`/proyectos/${r.proyecto.id}`} className="grid gap-1 rounded-md border border-border p-3 text-sm hover:bg-muted">
                <div className="flex items-center justify-between gap-3"><strong>{r.proyecto.nombre}</strong><Badge tone={r.prioridad.severidad === "CRITICA" || r.prioridad.severidad === "ALTA" ? "danger" : "warning"}>{r.prioridad.severidad}</Badge></div>
                <p>{r.prioridad.causaPrincipal}</p>
                <p className="text-muted-foreground">{r.prioridad.accionSugerida}</p>
              </Link>
            ))}
            {proyectosPriorizados.length === 0 && <EmptyState text="No hay proyectos que requieran atenciÃƒÂ³n inmediata." />}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Tabla ejecutiva avanzada</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="border-b border-border bg-muted text-left">
              <tr>
                {[
                  ["codigo", "CÃƒÂ³digo BIP"], ["proyecto", "Proyecto"], ["tipo", "Tipo estudio"], ["comuna", "Comuna"], ["consultora", "Consultora"], ["estado", "Estado"], ["riesgo", "Riesgo"], ["fisico", "Avance fÃƒÂ­sico"], ["financiero", "Avance financiero"], ["alertas", "Alertas"], ["dias", "DÃƒÂ­as contrato"], ["garantia", "GarantÃƒÂ­a"], ["critico", "CrÃƒÂ­tico"]
                ].map(([key, label]) => <th key={key} className="px-4 py-3"><SortLink label={label} sort={key} filters={filters} /></th>)}
              </tr>
            </thead>
            <tbody>
              {tabla.map((r) => (
                <tr key={r.proyecto.id} className="border-b border-border hover:bg-slate-50">
                  <td className="px-4 py-3">{r.proyecto.codigoBip}</td>
                  <td className="px-4 py-3"><Link href={`/proyectos/${r.proyecto.id}`} className="font-medium text-primary">{r.proyecto.nombre}</Link></td>
                  <td className="px-4 py-3">{r.proyecto.tipoEstudio.nombre}</td>
                  <td className="px-4 py-3">{r.proyecto.comuna}</td>
                  <td className="px-4 py-3">{r.proyecto.contrato?.nombreConsultora ?? "-"}</td>
                  <td className="px-4 py-3"><Badge>{estadoProyectoLabel[r.proyecto.estado]}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={tonoRiesgo(r.riesgo)}>{r.riesgo}</Badge></td>
                  <td className="px-4 py-3 w-36"><ProgressBar value={r.avanceFisico} /></td>
                  <td className="px-4 py-3 w-36"><ProgressBar value={r.avanceFinanciero} /></td>
                  <td className="px-4 py-3">{r.alertas.length}</td>
                  <td className="px-4 py-3">{r.proyecto.contrato ? daysUntil(r.proyecto.contrato.fechaTerminoVigente) : "-"}</td>
                  <td className="px-4 py-3">{r.estadoGarantia ? <Badge tone={tonoGarantia(r.estadoGarantia)}>{estadoGarantiaLabel[r.estadoGarantia]}</Badge> : "-"}</td>
                  <td className="px-4 py-3">{r.proyecto.esCriticoManual ? <Badge tone="danger">SÃƒÂ­</Badge> : <Badge tone="muted">No</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tabla.length === 0 && <EmptyState text="No hay proyectos para los filtros seleccionados." />}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card><CardContent className="flex items-center justify-between"><div><p className="text-xs font-medium text-muted-foreground">{title}</p><p className="mt-1 text-xl font-bold">{value}</p></div><div className="text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</div></CardContent></Card>
  );
}

function SelectFilter({ name, value, all, options }: { name: string; value?: string; all: string; options: string[][] }) {
  return <select name={name} defaultValue={value ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm"><option value="">{all}</option>{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>;
}

function SortLink({ label, sort, filters }: { label: string; sort: string; filters: SearchParams }) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value && key !== "sort" && key !== "dir") params.set(key, value); });
  params.set("sort", sort);
  params.set("dir", filters.sort === sort && filters.dir !== "desc" ? "desc" : "asc");
  return <Link href={`/?${params.toString()}`} className="font-medium hover:text-primary">{label}</Link>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-4 text-sm text-muted-foreground">{text}</p>;
}

function Heatmap({ tipos, rows }: { tipos: string[]; rows: Array<{ riesgo: string; values: number[] }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr><th className="px-2 py-2 text-left">Riesgo</th>{tipos.map((tipo) => <th key={tipo} className="px-2 py-2 text-left">{tipo}</th>)}</tr></thead>
        <tbody>{rows.map((row) => {
          const max = Math.max(1, ...rows.flatMap((item) => item.values));
          return <tr key={row.riesgo}><td className="px-2 py-2 font-medium">{row.riesgo}</td>{row.values.map((value, i) => <td key={i} className="px-2 py-2"><span className={`inline-flex h-8 w-full items-center justify-center rounded-sm text-xs font-semibold ${heatClass(value, max)}`}>{value}</span></td>)}</tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function heatClass(value: number, max: number) {
  const intensity = value / max;
  if (intensity >= 0.67) return "bg-red-200 text-red-900";
  if (intensity >= 0.34) return "bg-amber-200 text-amber-900";
  if (value === 1) return "bg-emerald-100 text-emerald-900";
  return "bg-slate-100 text-slate-400";
}

function promedio(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function agrupar<T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number, keyName: string) {
  return Object.entries(items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + valueFn(item);
    return acc;
  }, {})).map(([key, total]) => ({ [keyName]: key, total }));
}

function topConsultorasAtrasos(alertas: Array<{ proyecto: { contrato: { nombreConsultora: string } | null } }>) {
  return Object.keys(alertas.reduce<Record<string, number>>((acc, alerta) => {
    const consultora = alerta.proyecto.contrato?.nombreConsultora ?? "Sin consultora";
    acc[consultora] = (acc[consultora] ?? 0) + 1;
    return acc;
  }, {}));
}

function topConsultorasRiesgo(resumenes: Array<{ proyecto: { contrato: { nombreConsultora: string } | null }; riesgo: string; alertas: Array<{ diasAtraso: number }> }>) {
  const groups = resumenes.reduce<Record<string, { proyectos: number; alertas: number; atrasos: number; riesgoScore: number }>>((acc, r) => {
    const consultora = r.proyecto.contrato?.nombreConsultora ?? "Sin consultora";
    acc[consultora] ??= { proyectos: 0, alertas: 0, atrasos: 0, riesgoScore: 0 };
    acc[consultora].proyectos += 1;
    acc[consultora].alertas += r.alertas.length;
    acc[consultora].atrasos += r.alertas.filter((a) => a.diasAtraso > 0).length;
    acc[consultora].riesgoScore += r.riesgo === "ALTO" ? 3 : r.riesgo === "MEDIO" ? 2 : 1;
    return acc;
  }, {});

  return Object.entries(groups).map(([consultora, v]) => ({
    consultora,
    proyectos: v.proyectos,
    atrasos: v.atrasos,
    alertas: v.alertas,
    riesgo: v.riesgoScore / v.proyectos >= 2.5 ? "ALTO" : v.riesgoScore / v.proyectos >= 1.5 ? "MEDIO" : "BAJO"
  })).sort((a, b) => b.alertas - a.alertas).slice(0, 8);
}

function construirHeatmap(resumenes: Array<{ proyecto: { tipoEstudio: { nombre: string } }; riesgo: string }>) {
  const tipos = [...new Set(resumenes.map((r) => r.proyecto.tipoEstudio.nombre))];
  const riesgos = ["ALTO", "MEDIO", "BAJO"];
  return { tipos, rows: riesgos.map((riesgo) => ({ riesgo, values: tipos.map((tipo) => resumenes.filter((r) => r.proyecto.tipoEstudio.nombre === tipo && r.riesgo === riesgo).length) })) };
}

function ordenar<T extends { proyecto: { codigoBip: string; nombre: string; tipoEstudio: { nombre: string }; comuna: string; estado: string; esCriticoManual: boolean; contrato: { nombreConsultora: string; fechaTerminoVigente: Date } | null }; riesgo: string; avanceFisico: number; avanceFinanciero: number; alertas: unknown[]; estadoGarantia: string | null }>(items: T[], sort?: string, dir?: string) {
  const direction = dir === "desc" ? -1 : 1;
  const value = (r: T) => {
    if (sort === "codigo") return r.proyecto.codigoBip;
    if (sort === "proyecto") return r.proyecto.nombre;
    if (sort === "tipo") return r.proyecto.tipoEstudio.nombre;
    if (sort === "comuna") return r.proyecto.comuna;
    if (sort === "consultora") return r.proyecto.contrato?.nombreConsultora ?? "";
    if (sort === "estado") return r.proyecto.estado;
    if (sort === "riesgo") return r.riesgo;
    if (sort === "fisico") return r.avanceFisico;
    if (sort === "financiero") return r.avanceFinanciero;
    if (sort === "alertas") return r.alertas.length;
    if (sort === "dias") return r.proyecto.contrato ? daysUntil(r.proyecto.contrato.fechaTerminoVigente) : 99999;
    if (sort === "garantia") return r.estadoGarantia ?? "";
    if (sort === "critico") return r.proyecto.esCriticoManual ? 1 : 0;
    return r.riesgo === "ALTO" ? 0 : r.riesgo === "MEDIO" ? 1 : 2;
  };
  return [...items].sort((a, b) => String(value(a)).localeCompare(String(value(b)), "es", { numeric: true }) * direction);
}

function tonoRiesgo(riesgo: string): "success" | "warning" | "danger" {
  if (riesgo === "ALTO") return "danger";
  if (riesgo === "MEDIO") return "warning";
  return "success";
}

function tonoGarantia(estado: string): "success" | "warning" | "danger" {
  if (estado === EstadoGarantia.VENCIDA) return "danger";
  if (estado === EstadoGarantia.PROXIMA_A_VENCER) return "warning";
  return "success";
}
