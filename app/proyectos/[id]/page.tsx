import Link from "next/link";
import { Download } from "lucide-react";
import { EstadoHito } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { actualizarGeneral, crearHito, crearModificacion, eliminarHito, guardarContrato, guardarGarantia } from "@/app/actions";
import { estadoContratoLabel, estadoGarantiaLabel, estadoHitoLabel, estadoProyectoLabel, tipoModificacionLabel } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  avanceFinancieroProyecto,
  avanceFisicoProyecto,
  daysUntil,
  diasAtrasoConsultora,
  diasAtrasoServiu,
  estadoContratoCalculado,
  estadoGarantiaCalculado,
  estadoHitoCalculado,
  garantiaEvaluada,
  generarAlertasCalculadas,
  nivelRiesgoOperativo,
  sumaPorcentajes
} from "@/lib/business/rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ProgressBar } from "@/components/progress-bar";
import { DeleteHitoButton } from "@/components/delete-hito-button";
import { SubmitButton } from "@/components/submit-button";

export default async function ProyectoPage({ params }: { params: { id: string } }) {
  const proyectoId = Number(params.id);
  const [proyecto, tipos] = await Promise.all([
    prisma.proyectoEstudio.findUnique({
      where: { id: proyectoId },
      include: {
        tipoEstudio: true,
        contrato: true,
        garantia: true,
        hitos: { orderBy: { numero: "asc" } },
        modificaciones: { orderBy: { fecha: "desc" } },
        alertas: { orderBy: { fechaDeteccion: "desc" } }
      }
    }),
    prisma.tipoEstudio.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })
  ]);

  if (!proyecto) return <p>Proyecto no encontrado.</p>;

  const alertas = generarAlertasCalculadas(proyecto);
  const porcentajeTotal = sumaPorcentajes(proyecto.hitos);
  const montoPagado = proyecto.hitos.reduce((sum, h) => sum + h.montoPagado, 0);
  const montoProgramado = proyecto.hitos.reduce((sum, h) => sum + h.montoProgramado, 0);
  const avanceFisico = avanceFisicoProyecto(proyecto.hitos);
  const avanceFinanciero = avanceFinancieroProyecto(proyecto.hitos, proyecto.contrato);
  const riesgo = nivelRiesgoOperativo(proyecto);
  const garantia = garantiaEvaluada(proyecto);
  const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia) : null;
  const estadoContrato = proyecto.contrato ? estadoContratoCalculado(proyecto.contrato) : null;
  const diasRestantesContrato = proyecto.contrato ? daysUntil(proyecto.contrato.fechaTerminoVigente) : null;
  const historial = construirHistorial(proyecto);

  return (
    <div className="grid gap-6">
      <header className="grid gap-3 rounded-lg border border-border bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/proyectos" className="text-sm text-primary">Volver a proyectos</Link>
            <h2 className="mt-1 text-2xl font-bold">{proyecto.nombre}</h2>
            <p className="text-sm text-muted-foreground">{proyecto.codigoBip} · {proyecto.comuna} · {proyecto.tipoEstudio.nombre}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{estadoProyectoLabel[proyecto.estado]}</Badge>
            {proyecto.esCriticoManual && <Badge tone="danger">Crítico manual</Badge>}
            <Badge tone={tonoRiesgo(riesgo)}>Riesgo {riesgo}</Badge>
            {estadoGarantia && <Badge tone={estadoGarantia === "VENCIDA" ? "danger" : estadoGarantia === "PROXIMA_A_VENCER" ? "warning" : "success"}>{estadoGarantiaLabel[estadoGarantia]}</Badge>}
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {["general", "contrato", "hitos", "finanzas", "garantia", "modificaciones", "alertas", "historial", "reportes"].map((tab) => (
            <a key={tab} href={`#${tab}`} className="rounded-md border border-border px-3 py-1.5 capitalize hover:bg-muted">{tab}</a>
          ))}
        </nav>
      </header>

      <section>
        <Card>
          <CardHeader><CardTitle>Resumen del proyecto</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <Metric title="Estado actual" value={estadoProyectoLabel[proyecto.estado] ?? proyecto.estado} />
            <Metric title="Consultora" value={proyecto.contrato?.nombreConsultora ?? "-"} />
            <Metric title="Jefe proyecto" value={proyecto.contrato?.jefeProyecto ?? "-"} />
            <Metric title="Monto original" value={formatCurrency(proyecto.contrato?.montoOriginal)} />
            <Metric title="Monto vigente" value={formatCurrency(proyecto.contrato?.montoVigente)} />
            <Metric title="Nivel riesgo" value={riesgo} />
            <Metric title="Alertas activas" value={String(alertas.length)} />
            <Metric title="Días restantes contrato" value={diasRestantesContrato === null ? "-" : String(diasRestantesContrato)} />
            <Metric title="Garantía" value={estadoGarantia ? estadoGarantiaLabel[estadoGarantia] : "-"} />
            <Metric title="Contrato" value={estadoContrato ? estadoContratoLabel[estadoContrato] : "-"} />
            <div className="rounded-lg border border-border bg-white p-4 md:col-span-2">
              <p className="mb-2 text-xs text-muted-foreground">Avance físico</p>
              <ProgressBar value={avanceFisico} />
            </div>
            <div className="rounded-lg border border-border bg-white p-4 md:col-span-2">
              <p className="mb-2 text-xs text-muted-foreground">Avance financiero</p>
              <ProgressBar value={avanceFinanciero} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="general">
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <CardContent>
            <form action={actualizarGeneral.bind(null, proyecto.id)} className="grid gap-4 md:grid-cols-2">
              <Field label="Código BIP"><Input name="codigoBip" defaultValue={proyecto.codigoBip} required /></Field>
              <Field label="Nombre"><Input name="nombre" defaultValue={proyecto.nombre} required /></Field>
              <Field label="Tipo de estudio"><Select name="tipoEstudioId" defaultValue={proyecto.tipoEstudioId}>{tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Select></Field>
              <Field label="Comuna"><Input name="comuna" defaultValue={proyecto.comuna} required /></Field>
              <Field label="Estado"><Select name="estado" defaultValue={proyecto.estado}>{Object.entries(estadoProyectoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label="Resolución de bases"><Input name="resolucionBases" defaultValue={proyecto.resolucionBases ?? ""} /></Field>
              <Field label="Fecha resolución bases"><Input name="fechaResolucionBases" type="date" defaultValue={dateInput(proyecto.fechaResolucionBases)} /></Field>
              <Field label="Porcentaje garantía"><Input name="porcentajeGarantia" type="number" defaultValue={proyecto.porcentajeGarantia} /></Field>
              <Field label="Plazo garantía días"><Input name="plazoGarantiaDias" type="number" defaultValue={proyecto.plazoGarantiaDias} /></Field>
              <label className="flex items-center gap-2 text-sm md:col-span-2"><input name="esCriticoManual" type="checkbox" defaultChecked={proyecto.esCriticoManual} /> Proyecto crítico manual</label>
              <Field label="Observaciones generales"><Textarea name="observacionesGenerales" defaultValue={proyecto.observacionesGenerales ?? ""} /></Field>
              <div className="md:col-span-2"><SubmitButton>Guardar general</SubmitButton></div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section id="contrato">
        <Card>
          <CardHeader><CardTitle>Contrato</CardTitle></CardHeader>
          <CardContent>
            <form action={guardarContrato.bind(null, proyecto.id)} className="grid gap-4 md:grid-cols-2">
              <Field label="Consultora"><Input name="nombreConsultora" defaultValue={proyecto.contrato?.nombreConsultora ?? ""} required /></Field>
              <Field label="Jefe/a de proyecto"><Input name="jefeProyecto" defaultValue={proyecto.contrato?.jefeProyecto ?? ""} required /></Field>
              <Field label="Monto original"><Input name="montoOriginal" type="number" defaultValue={proyecto.contrato?.montoOriginal ?? 0} required /></Field>
              <Field label="Monto vigente"><Input name="montoVigente" type="number" defaultValue={proyecto.contrato?.montoVigente ?? 0} required /></Field>
              <Field label="Plazo consultor días"><Input name="plazoConsultorDias" type="number" defaultValue={proyecto.contrato?.plazoConsultorDias ?? 0} /></Field>
              <Field label="Plazo revisión SERVIU días"><Input name="plazoRevisionServiuDias" type="number" defaultValue={proyecto.contrato?.plazoRevisionServiuDias ?? 0} /></Field>
              <Field label="Fecha inicio"><Input name="fechaInicio" type="date" defaultValue={dateInput(proyecto.contrato?.fechaInicio)} /></Field>
              <Field label="Fecha término vigente"><Input name="fechaTerminoVigente" type="date" defaultValue={dateInput(proyecto.contrato?.fechaTerminoVigente)} /></Field>
              <div className="md:col-span-2"><SubmitButton>Guardar contrato</SubmitButton></div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section id="hitos">
        <Card>
          <CardHeader><CardTitle>Hitos y estados de pago</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">Suma porcentajes: <strong>{porcentajeTotal.toFixed(1)}%</strong></p>
              {Math.abs(porcentajeTotal - 100) > 0.01 && <Badge tone="warning">Advertencia: no suma 100%</Badge>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="bg-muted text-left"><tr><th className="px-3 py-2">N°</th><th>Hito</th><th>%</th><th>Monto programado</th><th>Programada</th><th>Real</th><th>Aprobación</th><th>Estado</th><th>Días atraso</th><th>Pagado</th><th></th></tr></thead>
                <tbody>
                  {proyecto.hitos.map((h) => {
                    const estado = estadoHitoCalculado(h, proyecto.contrato);
                    const diasAtraso = estado === EstadoHito.ATRASADO_CONSULTORA
                      ? diasAtrasoConsultora(h)
                      : proyecto.contrato && estado === EstadoHito.ATRASADO_SERVIU
                        ? diasAtrasoServiu(h, proyecto.contrato)
                        : 0;

                    return (
                      <tr key={h.id} className="border-b border-border">
                        <td className="px-3 py-2">{h.numero}</td>
                        <td>{h.nombre} {h.esFinal && <Badge tone="success">Final</Badge>}</td>
                        <td>{h.porcentajePago}%</td>
                        <td>{formatCurrency(h.montoProgramado)}</td>
                        <td>{formatDate(h.fechaEntregaProgramada)}</td>
                        <td>{formatDate(h.fechaEntregaReal)}</td>
                        <td>{formatDate(h.fechaAprobacion)}</td>
                        <td><Badge tone={tonoHito(estado, diasAtraso)}>{estadoHitoLabel[estado]}</Badge></td>
                        <td>{diasAtraso}</td>
                        <td>{formatCurrency(h.montoPagado)}</td>
                        <td><form action={eliminarHito.bind(null, proyecto.id, h.id)}><DeleteHitoButton /></form></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <form action={crearHito.bind(null, proyecto.id)} className="grid gap-3 md:grid-cols-4">
              <Field label="Número"><Input name="numero" type="number" required /></Field>
              <Field label="Nombre"><Input name="nombre" required /></Field>
              <Field label="Porcentaje pago"><Input name="porcentajePago" type="number" step="0.01" required /></Field>
              <Field label="Entrega programada"><Input name="fechaEntregaProgramada" type="date" required /></Field>
              <Field label="Entrega real"><Input name="fechaEntregaReal" type="date" /></Field>
              <Field label="Observaciones"><Input name="fechaObservaciones" type="date" /></Field>
              <Field label="Correcciones"><Input name="fechaCorrecciones" type="date" /></Field>
              <Field label="Aprobación"><Input name="fechaAprobacion" type="date" /></Field>
              <Field label="Estado"><Select name="estado">{Object.entries(estadoHitoLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label="Monto cobrado"><Input name="montoCobrado" type="number" defaultValue={0} /></Field>
              <Field label="Monto pagado"><Input name="montoPagado" type="number" defaultValue={0} /></Field>
              <Field label="Monto multa"><Input name="montoMulta" type="number" defaultValue={0} /></Field>
              <label className="flex items-center gap-2 text-sm"><input name="esFinal" type="checkbox" /> Final</label>
              <label className="flex items-center gap-2 text-sm"><input name="multaAplica" type="checkbox" /> Aplica multa</label>
              <div className="md:col-span-4"><SubmitButton>Agregar hito</SubmitButton></div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section id="finanzas" className="grid gap-4 md:grid-cols-5">
        <Metric title="Monto vigente" value={formatCurrency(proyecto.contrato?.montoVigente)} />
        <Metric title="Programado hitos" value={formatCurrency(montoProgramado)} />
        <Metric title="Pagado" value={formatCurrency(montoPagado)} />
        <Card><CardContent><p className="mb-2 text-xs text-muted-foreground">Avance físico</p><ProgressBar value={avanceFisico} /></CardContent></Card>
        <Card><CardContent><p className="mb-2 text-xs text-muted-foreground">Avance financiero</p><ProgressBar value={avanceFinanciero} /></CardContent></Card>
      </section>

      <section id="garantia">
        <Card>
          <CardHeader><CardTitle>Garantía de fiel cumplimiento</CardTitle></CardHeader>
          <CardContent>
            <form action={guardarGarantia.bind(null, proyecto.id)} className="grid gap-4 md:grid-cols-2">
              <Field label="Folio"><Input name="folio" defaultValue={proyecto.garantia?.folio ?? ""} required /></Field>
              <Field label="Monto"><Input name="monto" type="number" defaultValue={proyecto.garantia?.monto ?? 0} required /></Field>
              <Field label="Fecha emisión"><Input name="fechaEmision" type="date" defaultValue={dateInput(proyecto.garantia?.fechaEmision)} /></Field>
              <Field label="Fecha vencimiento calculada">
                <Input name="fechaVencimiento" type="date" defaultValue={dateInput(garantia?.fechaVencimiento)} readOnly={Boolean(proyecto.contrato)} />
              </Field>
              <p className="text-sm text-muted-foreground md:col-span-2">
                La fecha de vencimiento de la garantía corresponde a la fecha término contrato vigente más {proyecto.plazoGarantiaDias} días.
              </p>
              <div className="md:col-span-2"><SubmitButton>Guardar garantía</SubmitButton></div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section id="modificaciones">
        <Card>
          <CardHeader><CardTitle>Modificaciones contractuales</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              {proyecto.modificaciones.map((m) => (
                <div key={m.id} className="rounded-md border border-border p-3 text-sm">
                  <strong>{tipoModificacionLabel[m.tipo]}</strong> · {formatDate(m.fecha)} · {m.resolucion}
                  <p className="text-muted-foreground">{m.descripcion}</p>
                  <p>Variación monto: {formatCurrency(m.variacionMonto)} · Nuevo monto vigente: {formatCurrency(m.nuevoMontoVigente)} · Nueva fecha término: {formatDate(m.nuevaFechaTerminoVigente)}</p>
                </div>
              ))}
            </div>
            <form action={crearModificacion.bind(null, proyecto.id)} className="grid gap-3 md:grid-cols-3">
              <Field label="Tipo"><Select name="tipo">{Object.entries(tipoModificacionLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label="Fecha"><Input name="fecha" type="date" required /></Field>
              <Field label="Resolución"><Input name="resolucion" required /></Field>
              <Field label="Variación monto"><Input name="variacionMonto" type="number" defaultValue={0} /></Field>
              <Field label="Variación plazo consultor"><Input name="variacionPlazoConsultorDias" type="number" defaultValue={0} /></Field>
              <Field label="Variación plazo revisión"><Input name="variacionPlazoRevisionServiuDias" type="number" defaultValue={0} /></Field>
              <Field label="Descripción"><Textarea name="descripcion" required /></Field>
              <div className="md:col-span-3"><SubmitButton disabled={!proyecto.contrato}>Registrar modificación y actualizar contrato</SubmitButton></div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section id="alertas">
        <Card>
          <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {alertas.map((a, i) => <div key={i} className="rounded-md border border-border p-3 text-sm"><Badge tone={a.severidad === "CRITICA" || a.severidad === "ALTA" ? "danger" : "warning"}>{a.severidad}</Badge> <strong>{a.responsable}</strong><p>{a.mensaje}</p></div>)}
            {alertas.length === 0 && <p className="text-sm text-muted-foreground">Sin alertas calculadas.</p>}
          </CardContent>
        </Card>
      </section>

      <section id="historial">
        <Card>
          <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {historial.map((evento, index) => (
              <div key={`${evento.fecha.toISOString()}-${index}`} className="grid gap-1 rounded-md border border-border p-3 text-sm md:grid-cols-[160px_160px_1fr_100px]">
                <span className="text-muted-foreground">{formatDate(evento.fecha)}</span>
                <strong>{evento.tipo}</strong>
                <span>{evento.detalle}</span>
                <Badge tone={evento.usuario === "Sistema" ? "muted" : "default"}>{evento.usuario}</Badge>
              </div>
            ))}
            {historial.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>}
          </CardContent>
        </Card>
      </section>

      <section id="reportes">
        <Card>
          <CardHeader><CardTitle>Reportes</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href={`/api/reportes/word/proyecto/${proyecto.id}`}><Button><Download className="h-4 w-4" /> Word proyecto</Button></Link>
            <Link href="/api/reportes/word/cartera-critica"><Button variant="outline"><Download className="h-4 w-4" /> Word cartera crítica</Button></Link>
            <Link href="/api/reportes/word/garantias"><Button variant="outline"><Download className="h-4 w-4" /> Word garantías</Button></Link>
            <Link href="/api/reportes/excel/cartera"><Button variant="outline"><Download className="h-4 w-4" /> Excel cartera</Button></Link>
            <Link href="/api/reportes/excel/hitos"><Button variant="outline"><Download className="h-4 w-4" /> Excel hitos</Button></Link>
            <Link href="/api/reportes/excel/alertas"><Button variant="outline"><Download className="h-4 w-4" /> Excel alertas</Button></Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <Card><CardContent><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-lg font-bold">{value}</p></CardContent></Card>;
}

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function construirHistorial(proyecto: {
  createdAt: Date;
  updatedAt: Date;
  esCriticoManual: boolean;
  contrato: { createdAt: Date; updatedAt: Date } | null;
  garantia: { createdAt: Date; updatedAt: Date; folio: string; fechaVencimiento: Date } | null;
  hitos: {
    nombre: string;
    createdAt: Date;
    updatedAt: Date;
    fechaAprobacion: Date | null;
    fechaObservaciones: Date | null;
    fechaCorrecciones: Date | null;
  }[];
  modificaciones: { tipo: string; fecha: Date; resolucion: string; createdAt: Date }[];
  alertas: {
    tipo: string;
    mensaje: string;
    fechaDeteccion: Date;
    resuelta: boolean;
    fechaResolucion: Date | null;
    comentarioResolucion: string | null;
  }[];
}) {
  const eventos: { fecha: Date; tipo: string; detalle: string; usuario: "Sistema" | "Manual" }[] = [
    { fecha: proyecto.createdAt, tipo: "Proyecto creado", detalle: "Registro inicial del proyecto.", usuario: "Manual" },
    { fecha: proyecto.updatedAt, tipo: "Proyecto actualizado", detalle: "Datos generales actualizados.", usuario: "Manual" }
  ];

  if (proyecto.esCriticoManual) {
    eventos.push({ fecha: proyecto.updatedAt, tipo: "Proyecto marcado critico", detalle: "Marca manual de criticidad activa.", usuario: "Manual" });
  }
  if (proyecto.contrato) {
    eventos.push({ fecha: proyecto.contrato.createdAt, tipo: "Contrato creado", detalle: "Contrato registrado en la ficha.", usuario: "Manual" });
    eventos.push({ fecha: proyecto.contrato.updatedAt, tipo: "Contrato modificado", detalle: "Contrato vigente actualizado.", usuario: "Manual" });
  }
  proyecto.hitos.forEach((hito) => {
    eventos.push({ fecha: hito.createdAt, tipo: "Hito agregado", detalle: hito.nombre, usuario: "Manual" });
    if (hito.updatedAt > hito.createdAt) eventos.push({ fecha: hito.updatedAt, tipo: "Hito editado", detalle: hito.nombre, usuario: "Manual" });
    if (hito.fechaObservaciones) eventos.push({ fecha: hito.fechaObservaciones, tipo: "Observaciones registradas", detalle: hito.nombre, usuario: "Manual" });
    if (hito.fechaCorrecciones) eventos.push({ fecha: hito.fechaCorrecciones, tipo: "Correcciones registradas", detalle: hito.nombre, usuario: "Manual" });
    if (hito.fechaAprobacion) eventos.push({ fecha: hito.fechaAprobacion, tipo: "Hito aprobado", detalle: hito.nombre, usuario: "Manual" });
  });
  if (proyecto.garantia) {
    eventos.push({ fecha: proyecto.garantia.createdAt, tipo: "Garantia registrada", detalle: `Folio ${proyecto.garantia.folio}`, usuario: "Manual" });
    eventos.push({ fecha: proyecto.garantia.updatedAt, tipo: "Garantia recalculada", detalle: `Vencimiento ${formatDate(proyecto.garantia.fechaVencimiento)}`, usuario: "Sistema" });
  }
  proyecto.modificaciones.forEach((modificacion) => {
    eventos.push({ fecha: modificacion.createdAt, tipo: "Modificacion contractual agregada", detalle: `${tipoModificacionLabel[modificacion.tipo] ?? modificacion.tipo} · ${modificacion.resolucion}`, usuario: "Manual" });
  });
  proyecto.alertas.forEach((alerta) => {
    eventos.push({ fecha: alerta.fechaDeteccion, tipo: "Alerta generada", detalle: alerta.mensaje, usuario: "Sistema" });
    if (alerta.resuelta && alerta.fechaResolucion) {
      eventos.push({ fecha: alerta.fechaResolucion, tipo: "Alerta resuelta", detalle: alerta.comentarioResolucion ?? alerta.tipo, usuario: "Manual" });
    }
  });

  return eventos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

function tonoRiesgo(riesgo: string): "success" | "warning" | "danger" {
  if (riesgo === "ALTO") return "danger";
  if (riesgo === "MEDIO") return "warning";
  return "success";
}

function tonoHito(estado: string, diasAtraso: number): "default" | "success" | "warning" | "danger" | "muted" {
  if (estado === EstadoHito.ATRASADO_CONSULTORA) return "danger";
  if (estado === EstadoHito.ATRASADO_SERVIU) return diasAtraso > 15 ? "danger" : "warning";
  if (estado === EstadoHito.APROBADO) return "success";
  return "default";
}
