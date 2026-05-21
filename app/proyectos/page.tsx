import Link from "next/link";

import { Download, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { crearProyecto } from "@/app/actions";
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
  advertenciasConsistencia
} from "@/lib/business/rules";
import { EstadoContrato, EstadoGarantia } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ProgressBar } from "@/components/progress-bar";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function ProyectosPage({
  searchParams
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const filtros = searchParams ?? {};
  const [proyectos, tipos] = await Promise.all([
    prisma.proyectoEstudio.findMany({
      include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.tipoEstudio.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })
  ]);
  const comunas = [...new Set(proyectos.map((p) => p.comuna))].sort();
  const consultoras = [...new Set(proyectos.map((p) => p.contrato?.nombreConsultora).filter((value): value is string => Boolean(value)))].sort();
  const proyectosFiltrados = proyectos.filter((p) => {
    const alertas = generarAlertasCalculadas(p);
    const riesgo = nivelRiesgoOperativo(p);
    const estadoContrato = p.contrato ? estadoContratoCalculado(p.contrato) : null;
    const garantia = garantiaEvaluada(p);
    const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia) : null;
    if (filtros.riesgo && riesgo !== filtros.riesgo) return false;
    if (filtros.comuna && p.comuna !== filtros.comuna) return false;
    if (filtros.tipoEstudioId && String(p.tipoEstudioId) !== filtros.tipoEstudioId) return false;
    if (filtros.consultora && p.contrato?.nombreConsultora !== filtros.consultora) return false;
    if (filtros.estado && p.estado !== filtros.estado) return false;
    if (filtros.critico && String(p.esCriticoManual) !== filtros.critico) return false;
    if (filtros.contratoVencido === "si" && estadoContrato !== EstadoContrato.VENCIDO) return false;
    if (filtros.garantiaVencida === "si" && estadoGarantia !== EstadoGarantia.VENCIDA) return false;
    if (filtros.conAlertas === "si" && alertas.length === 0) return false;
    if (filtros.atrasoConsultora === "si" && !alertas.some((a) => a.responsable === "Consultora")) return false;
    if (filtros.atrasoServiu === "si" && !alertas.some((a) => a.responsable === "SERVIU")) return false;
    return true;
  });

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tabla ejecutiva de cartera</p>
          <h2 className="text-2xl font-bold">Proyectos y estudios</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/alertas"><Button variant="outline">Alertas operativas</Button></Link>
          <Link href="/api/reportes/excel/base-completa">
            <Button variant="outline"><Download className="h-4 w-4" /> Descargar base completa Excel</Button>
          </Link>
          <a href="#nuevo"><Button><Plus className="h-4 w-4" /> Crear proyecto</Button></a>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Filtros avanzados</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-2 md:grid-cols-5">
            <select name="riesgo" defaultValue={filtros.riesgo ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todos los riesgos</option>
              {["BAJO", "MEDIO", "ALTO"].map((riesgo) => <option key={riesgo}>{riesgo}</option>)}
            </select>
            <select name="comuna" defaultValue={filtros.comuna ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todas las comunas</option>
              {comunas.map((comuna) => <option key={comuna}>{comuna}</option>)}
            </select>
            <select name="tipoEstudioId" defaultValue={filtros.tipoEstudioId ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todos los tipos</option>
              {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
            </select>
            <select name="consultora" defaultValue={filtros.consultora ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todas las consultoras</option>
              {consultoras.map((consultora) => <option key={consultora}>{consultora}</option>)}
            </select>
            <select name="estado" defaultValue={filtros.estado ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">Todos los estados</option>
              {Object.entries(estadoProyectoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="critico" defaultValue={filtros.critico ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
              <option value="">CrÃƒÆ’Ã‚Â­tico manual: todos</option>
              <option value="true">SÃƒÆ’Ã‚Â­</option>
              <option value="false">No</option>
            </select>
            {[
              ["contratoVencido", "Contrato vencido"],
              ["garantiaVencida", "GarantÃƒÆ’Ã‚Â­a vencida"],
              ["conAlertas", "Con alertas"],
              ["atrasoConsultora", "Atraso consultora"],
              ["atrasoServiu", "Atraso SERVIU"]
            ].map(([name, label]) => (
              <select key={name} name={name} defaultValue={filtros[name] ?? ""} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
                <option value="">{label}: todos</option>
                <option value="si">SÃƒÆ’Ã‚Â­</option>
              </select>
            ))}
            <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground md:col-span-5">Aplicar filtros</button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1680px] text-sm">
            <thead className="border-b border-border bg-muted text-left">
              <tr>
                <th className="px-4 py-3">CÃƒÂ³digo BIP</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo de estudio</th>
                <th className="px-4 py-3">Consultora</th>
                <th className="px-4 py-3">Comuna</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Nivel riesgo</th>
                <th className="px-4 py-3">Avance fÃƒÂ­sico</th>
                <th className="px-4 py-3">Avance financiero</th>
                <th className="px-4 py-3">DÃƒÂ­as restantes contrato</th>
                <th className="px-4 py-3">TÃƒÂ©rmino contrato vigente</th>
                <th className="px-4 py-3">Vencimiento garantÃƒÂ­a</th>
                <th className="px-4 py-3">Alerta contrato</th>
                <th className="px-4 py-3">Alerta garantÃƒÂ­a</th>
                <th className="px-4 py-3">Alertas activas</th>
                <th className="px-4 py-3">Advertencias</th>
                <th className="px-4 py-3">CrÃƒÂ­tico manual</th>
                <th className="px-4 py-3 text-right">Monto vigente</th>
              </tr>
            </thead>
            <tbody>
              {proyectosFiltrados.map((p) => {
                const estadoContrato = p.contrato ? estadoContratoCalculado(p.contrato) : null;
                const garantia = garantiaEvaluada(p);
                const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia) : null;
                const riesgo = nivelRiesgoOperativo(p);
                const alertas = generarAlertasCalculadas(p);
                const advertencias = advertenciasConsistencia(p);
                const avanceFisico = avanceFisicoProyecto(p.hitos);
                const avanceFinanciero = avanceFinancieroProyecto(p.hitos, p.contrato);
                const diasRestantesContrato = p.contrato ? daysUntil(p.contrato.fechaTerminoVigente) : null;

                return (
                  <tr key={p.id} className="border-b border-border hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium"><Link href={`/proyectos/${p.id}`}>{p.codigoBip}</Link></td>
                    <td className="px-4 py-3"><Link href={`/proyectos/${p.id}`} className="font-medium text-primary">{p.nombre}</Link></td>
                    <td className="px-4 py-3">{p.tipoEstudio.nombre}</td>
                    <td className="px-4 py-3">{p.contrato?.nombreConsultora ?? "-"}</td>
                    <td className="px-4 py-3">{p.comuna}</td>
                    <td className="px-4 py-3"><Badge>{estadoProyectoLabel[p.estado]}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={tonoRiesgo(riesgo)}>{riesgo}</Badge></td>
                    <td className="px-4 py-3 w-36"><ProgressBar value={avanceFisico} /></td>
                    <td className="px-4 py-3 w-36"><ProgressBar value={avanceFinanciero} /></td>
                    <td className="px-4 py-3">{diasRestantesContrato ?? "-"}</td>
                    <td className="px-4 py-3">{formatDate(p.contrato?.fechaTerminoVigente)}</td>
                    <td className="px-4 py-3">{formatDate(garantia?.fechaVencimiento)}</td>
                    <td className="px-4 py-3">
                      {estadoContrato ? <Badge tone={tonoContrato(estadoContrato)}>{estadoContratoLabel[estadoContrato]}</Badge> : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {estadoGarantia ? <Badge tone={tonoGarantia(estadoGarantia)}>{estadoGarantiaLabel[estadoGarantia]}</Badge> : "-"}
                    </td>
                    <td className="px-4 py-3">{alertas.length}</td>
                    <td className="px-4 py-3">{advertencias.length ? <Badge tone="warning" title={advertencias.join(" ")}>{advertencias.length}</Badge> : <Badge tone="success">0</Badge>}</td>
                    <td className="px-4 py-3">{p.esCriticoManual ? <Badge tone="danger">SÃƒÂ­</Badge> : <Badge tone="muted">No</Badge>}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(p.contrato?.montoVigente)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {proyectosFiltrados.length === 0 && <p className="p-4 text-sm text-muted-foreground">No hay proyectos para los filtros seleccionados.</p>}
        </CardContent>
      </Card>

      <Card id="nuevo">
        <CardHeader><CardTitle>Nuevo proyecto</CardTitle></CardHeader>
        <CardContent>
          <form action={crearProyecto} className="grid gap-4 md:grid-cols-2">
            <Field label="CÃƒÂ³digo BIP"><Input name="codigoBip" required /></Field>
            <Field label="Nombre"><Input name="nombre" required /></Field>
            <Field label="Tipo de estudio">
              <Select name="tipoEstudioId" required>{tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Select>
            </Field>
            <Field label="Comuna"><Input name="comuna" required /></Field>
            <Field label="Estado">
              <Select name="estado">{Object.entries(estadoProyectoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            </Field>
            <Field label="ResoluciÃƒÂ³n de bases"><Input name="resolucionBases" /></Field>
            <Field label="Fecha resoluciÃƒÂ³n bases"><Input name="fechaResolucionBases" type="date" /></Field>
            <Field label="Porcentaje garantÃƒÂ­a"><Input name="porcentajeGarantia" type="number" defaultValue={5} /></Field>
            <Field label="Plazo garantÃƒÂ­a dÃƒÂ­as"><Input name="plazoGarantiaDias" type="number" defaultValue={365} /></Field>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input name="esCriticoManual" type="checkbox" /> Marcar como crÃƒÂ­tico manual</label>
            <Field label="Observaciones generales"><Textarea name="observacionesGenerales" /></Field>
            <div className="md:col-span-2"><SubmitButton>Guardar proyecto</SubmitButton></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function tonoContrato(estado: string): "success" | "warning" | "danger" {
  if (estado === EstadoContrato.VENCIDO) return "danger";
  if (estado === EstadoContrato.PROXIMO_A_VENCER) return "warning";
  return "success";
}

function tonoGarantia(estado: string): "success" | "warning" | "danger" {
  if (estado === EstadoGarantia.VENCIDA) return "danger";
  if (estado === EstadoGarantia.PROXIMA_A_VENCER) return "warning";
  return "success";
}

function tonoRiesgo(riesgo: string): "success" | "warning" | "danger" {
  if (riesgo === "ALTO") return "danger";
  if (riesgo === "MEDIO") return "warning";
  return "success";
}
