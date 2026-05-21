import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { prisma } from "@/lib/prisma";
import { avanceFinancieroProyecto, avanceFisicoProyecto, calcularFechaVencimientoGarantiaProyecto, detectarAnomalias, estadoGarantiaCalculado, generarAlertasCalculadas, nivelRiesgoOperativo } from "@/lib/business/rules";
import { estadoGarantiaLabel, estadoProyectoLabel, tipoAlertaLabel } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function wordProyecto(id: number) {
  const p = await prisma.proyectoEstudio.findUniqueOrThrow({
    where: { id },
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: { orderBy: { numero: "asc" } }, modificaciones: true }
  });
  return pack([
    title(`Reporte ejecutivo - ${p.nombre}`),
    para(`Código BIP: ${p.codigoBip}`),
    para(`Comuna: ${p.comuna}`),
    para(`Tipo de estudio: ${p.tipoEstudio.nombre}`),
    para(`Estado: ${estadoProyectoLabel[p.estado]}`),
    heading("Contrato"),
    para(`Consultora: ${p.contrato?.nombreConsultora ?? "-"}`),
    para(`Jefe/a de proyecto: ${p.contrato?.jefeProyecto ?? "-"}`),
    para(`Monto original: ${formatCurrency(p.contrato?.montoOriginal)}`),
    para(`Monto vigente: ${formatCurrency(p.contrato?.montoVigente)}`),
    heading("Hitos"),
    table([["N°", "Hito", "%", "Programado", "Pagado"], ...p.hitos.map((h) => [String(h.numero), h.nombre, `${h.porcentajePago}%`, formatCurrency(h.montoProgramado), formatCurrency(h.montoPagado)])]),
    heading("Alertas"),
    ...generarAlertasCalculadas(p).map((a) => para(`${tipoAlertaLabel[a.tipo]}: ${a.mensaje}`))
  ]);
}

export async function wordCarteraCritica() {
  const proyectos = await prisma.proyectoEstudio.findMany({ where: { esCriticoManual: true }, include: { tipoEstudio: true, contrato: true } });
  return pack([
    title("Reporte de cartera crítica"),
    table([["Código BIP", "Proyecto", "Comuna", "Consultora", "Monto vigente"], ...proyectos.map((p) => [p.codigoBip, p.nombre, p.comuna, p.contrato?.nombreConsultora ?? "-", formatCurrency(p.contrato?.montoVigente)])])
  ]);
}

export async function wordGarantias() {
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { garantia: true, contrato: true } });
  const rows = proyectos
    .map((p) => {
      const fechaVencimiento = calcularFechaVencimientoGarantiaProyecto(p) ?? p.garantia?.fechaVencimiento;
      const estado = p.garantia && fechaVencimiento
        ? estadoGarantiaCalculado({ ...p.garantia, fechaVencimiento })
        : null;
      return { proyecto: p, fechaVencimiento, estado };
    })
    .filter((item) => item.estado && ["PROXIMA_A_VENCER", "VENCIDA"].includes(item.estado))
    .map((item) => [
      item.proyecto.nombre,
      item.proyecto.garantia?.folio ?? "-",
      estadoGarantiaLabel[item.estado!],
      formatDate(item.fechaVencimiento)
    ]);
  return pack([title("Garantías próximas a vencer y vencidas"), table([["Proyecto", "Folio", "Estado", "Vencimiento"], ...rows])]);
}

export async function wordComparativo(ids?: number[]) {
  const proyectos = await prisma.proyectoEstudio.findMany({
    where: ids?.length ? { id: { in: ids } } : undefined,
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
    orderBy: { nombre: "asc" }
  });
  return pack([
    title("Informe ejecutivo comparativo"),
    para(`Proyectos comparados: ${proyectos.length}`),
    table([
      ["Proyecto", "Consultora", "Comuna", "Tipo", "Monto vigente", "Fisico", "Financiero", "Riesgo", "Alertas"],
      ...proyectos.map((p) => [
        p.nombre,
        p.contrato?.nombreConsultora ?? "-",
        p.comuna,
        p.tipoEstudio.nombre,
        formatCurrency(p.contrato?.montoVigente),
        `${avanceFisicoProyecto(p.hitos)}%`,
        `${avanceFinancieroProyecto(p.hitos, p.contrato)}%`,
        nivelRiesgoOperativo(p),
        String(generarAlertasCalculadas(p).length)
      ])
    ])
  ]);
}

export async function wordAnomaliasCriticas() {
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true } });
  const filas = proyectos
    .flatMap((p) => detectarAnomalias(p).map((a) => ({ proyecto: p, anomalia: a })))
    .filter((item) => item.anomalia.severidad === "CRITICA" || item.anomalia.severidad === "ALTA");
  return pack([
    title("Informe de anomalias criticas"),
    para(`Anomalias criticas o altas detectadas: ${filas.length}`),
    table([
      ["Proyecto", "Codigo BIP", "Tipo", "Severidad", "Accion sugerida"],
      ...filas.map((fila) => [
        fila.proyecto.nombre,
        fila.proyecto.codigoBip,
        fila.anomalia.tipo,
        fila.anomalia.severidad,
        fila.anomalia.accionSugerida
      ])
    ])
  ]);
}

function pack(children: (Paragraph | Table)[]) {
  const document = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(document);
}

function title(text: string) {
  return new Paragraph({ children: [new TextRun({ text, bold: true, size: 32 })], spacing: { after: 240 } });
}

function heading(text: string) {
  return new Paragraph({ children: [new TextRun({ text, bold: true, size: 24 })], spacing: { before: 220, after: 120 } });
}

function para(text: string) {
  return new Paragraph({ children: [new TextRun(text)], spacing: { after: 80 } });
}

function table(rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, index) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            shading: index === 0 ? { fill: "0E7490" } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: cell, bold: index === 0, color: index === 0 ? "FFFFFF" : "111827" })] })]
          })
        )
      })
    )
  });
}
