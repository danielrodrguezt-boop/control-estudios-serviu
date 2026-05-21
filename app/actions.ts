"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addDays, calcularFechaTerminoContratoVigente, calcularFechaVencimientoGarantiaProyecto, calcularMontoProgramado } from "@/lib/business/rules";
import { EstadoGarantia } from "@/lib/enums";
import { requireAdmin, requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T00:00:00`) : null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key).trim();
  if (!value) throw new Error(`${label} es obligatorio.`);
  return value;
}

function assertNonNegative(value: number, label: string) {
  if (value < 0) throw new Error(`${label} no puede ser negativo.`);
}

function assertDateOrder(previous: Date | null, next: Date | null, message: string) {
  if (previous && next && next < previous) throw new Error(message);
}

export async function crearProyecto(formData: FormData) {
  await requireUser();
  const plazoGarantiaDias = numberValue(formData, "plazoGarantiaDias", 365);
  const tipoEstudioId = numberValue(formData, "tipoEstudioId");
  assertNonNegative(plazoGarantiaDias, "El plazo de garantía");
  if (tipoEstudioId <= 0) throw new Error("El tipo de estudio es obligatorio.");

  const proyecto = await prisma.proyectoEstudio.create({
    data: {
      codigoBip: requiredText(formData, "codigoBip", "El código BIP"),
      nombre: requiredText(formData, "nombre", "El nombre"),
      tipoEstudioId,
      comuna: requiredText(formData, "comuna", "La comuna"),
      estado: requiredText(formData, "estado", "El estado"),
      esCriticoManual: formData.get("esCriticoManual") === "on",
      resolucionBases: text(formData, "resolucionBases") || null,
      fechaResolucionBases: optionalDate(formData, "fechaResolucionBases"),
      porcentajeGarantia: numberValue(formData, "porcentajeGarantia", 5),
      plazoGarantiaDias,
      observacionesGenerales: text(formData, "observacionesGenerales") || null
    }
  });

  redirect(`/proyectos/${proyecto.id}`);
}

export async function actualizarGeneral(proyectoId: number, formData: FormData) {
  await requireUser();
  const plazoGarantiaDias = numberValue(formData, "plazoGarantiaDias", 365);
  const tipoEstudioId = numberValue(formData, "tipoEstudioId");
  assertNonNegative(plazoGarantiaDias, "El plazo de garantía");
  if (tipoEstudioId <= 0) throw new Error("El tipo de estudio es obligatorio.");

  await prisma.proyectoEstudio.update({
    where: { id: proyectoId },
    data: {
      codigoBip: requiredText(formData, "codigoBip", "El código BIP"),
      nombre: requiredText(formData, "nombre", "El nombre"),
      tipoEstudioId,
      comuna: requiredText(formData, "comuna", "La comuna"),
      estado: requiredText(formData, "estado", "El estado"),
      esCriticoManual: formData.get("esCriticoManual") === "on",
      resolucionBases: text(formData, "resolucionBases") || null,
      fechaResolucionBases: optionalDate(formData, "fechaResolucionBases"),
      porcentajeGarantia: numberValue(formData, "porcentajeGarantia", 5),
      plazoGarantiaDias,
      observacionesGenerales: text(formData, "observacionesGenerales") || null
    }
  });
  await recalcularFechaGarantia(proyectoId);
  revalidatePath(`/proyectos/${proyectoId}`);
}

export async function guardarContrato(proyectoId: number, formData: FormData) {
  await requireUser();
  const fechaInicio = optionalDate(formData, "fechaInicio") ?? new Date();
  const plazoConsultorDias = numberValue(formData, "plazoConsultorDias");
  const plazoRevisionServiuDias = numberValue(formData, "plazoRevisionServiuDias");
  const plazoTotalDias = plazoConsultorDias + plazoRevisionServiuDias;
  const fechaTerminoContractual = addDays(fechaInicio, plazoTotalDias);
  const montoOriginal = numberValue(formData, "montoOriginal");
  const montoVigente = numberValue(formData, "montoVigente", montoOriginal);
  const fechaTerminoVigente = optionalDate(formData, "fechaTerminoVigente") ?? fechaTerminoContractual;

  assertNonNegative(montoOriginal, "El monto original");
  assertNonNegative(montoVigente, "El monto vigente");
  assertNonNegative(plazoConsultorDias, "El plazo consultor");
  assertNonNegative(plazoRevisionServiuDias, "El plazo de revisión SERVIU");
  assertDateOrder(fechaInicio, fechaTerminoVigente, "La fecha término vigente no puede ser anterior a la fecha de inicio.");

  await prisma.contrato.upsert({
    where: { proyectoId },
    create: {
      proyectoId,
      nombreConsultora: requiredText(formData, "nombreConsultora", "La consultora"),
      jefeProyecto: requiredText(formData, "jefeProyecto", "El jefe/a de proyecto"),
      montoOriginal,
      montoVigente,
      plazoConsultorDias,
      plazoRevisionServiuDias,
      plazoTotalDias,
      fechaInicio,
      fechaTerminoContractual,
      fechaTerminoVigente
    },
    update: {
      nombreConsultora: requiredText(formData, "nombreConsultora", "La consultora"),
      jefeProyecto: requiredText(formData, "jefeProyecto", "El jefe/a de proyecto"),
      montoOriginal,
      montoVigente,
      plazoConsultorDias,
      plazoRevisionServiuDias,
      plazoTotalDias,
      fechaInicio,
      fechaTerminoContractual,
      fechaTerminoVigente
    }
  });

  await recalcularMontosHitos(proyectoId);
  await recalcularFechaGarantia(proyectoId);
  revalidatePath(`/proyectos/${proyectoId}`);
}

export async function crearHito(proyectoId: number, formData: FormData) {
  await requireUser();
  const contrato = await prisma.contrato.findUnique({ where: { proyectoId } });
  const porcentajePago = numberValue(formData, "porcentajePago");
  const fechaEntregaReal = optionalDate(formData, "fechaEntregaReal");
  const fechaObservaciones = optionalDate(formData, "fechaObservaciones");
  const fechaCorrecciones = optionalDate(formData, "fechaCorrecciones");
  const fechaAprobacion = optionalDate(formData, "fechaAprobacion");
  const montoPagado = numberValue(formData, "montoPagado");
  const montoProgramado = calcularMontoProgramado(contrato?.montoVigente ?? 0, porcentajePago);

  if (porcentajePago < 0 || porcentajePago > 100) throw new Error("El porcentaje de pago debe estar entre 0 y 100.");
  assertDateOrder(fechaEntregaReal, fechaAprobacion, "La fecha de aprobación no puede ser anterior a la fecha de entrega.");
  assertDateOrder(fechaObservaciones, fechaCorrecciones, "La fecha de correcciones no puede ser anterior a la fecha de observaciones.");
  assertNonNegative(montoPagado, "El monto pagado");
  if (montoPagado > montoProgramado) throw new Error("El monto pagado no debe superar el monto programado del hito.");

  await prisma.hito.create({
    data: {
      proyectoId,
      numero: numberValue(formData, "numero"),
      nombre: requiredText(formData, "nombre", "El nombre del hito"),
      esFinal: formData.get("esFinal") === "on",
      porcentajePago,
      montoProgramado,
      fechaEntregaProgramada: optionalDate(formData, "fechaEntregaProgramada") ?? new Date(),
      fechaEntregaReal,
      fechaObservaciones,
      fechaCorrecciones,
      fechaAprobacion,
      estado: text(formData, "estado"),
      multaAplica: formData.get("multaAplica") === "on",
      montoMulta: numberValue(formData, "montoMulta"),
      montoCobrado: numberValue(formData, "montoCobrado"),
      montoPagado
    }
  });
  await prisma.proyectoEstudio.update({ where: { id: proyectoId }, data: { numeroEstadosPago: { increment: 1 } } });
  revalidatePath(`/proyectos/${proyectoId}`);
}

export async function eliminarHito(proyectoId: number, hitoId: number) {
  await requireAdmin();
  await prisma.hito.delete({ where: { id: hitoId } });
  await prisma.proyectoEstudio.update({ where: { id: proyectoId }, data: { numeroEstadosPago: { decrement: 1 } } });
  revalidatePath(`/proyectos/${proyectoId}`);
}

export async function guardarGarantia(proyectoId: number, formData: FormData) {
  await requireUser();
  const fechaVencimientoCalculada = await obtenerFechaVencimientoGarantiaCalculada(proyectoId);
  const monto = numberValue(formData, "monto");
  assertNonNegative(monto, "El monto de garantía");

  await prisma.garantia.upsert({
    where: { proyectoId },
    create: {
      proyectoId,
      folio: requiredText(formData, "folio", "El folio de garantía"),
      monto,
      fechaEmision: optionalDate(formData, "fechaEmision") ?? new Date(),
      fechaVencimiento: fechaVencimientoCalculada ?? optionalDate(formData, "fechaVencimiento") ?? new Date(),
      estado: EstadoGarantia.VIGENTE
    },
    update: {
      folio: requiredText(formData, "folio", "El folio de garantía"),
      monto,
      fechaEmision: optionalDate(formData, "fechaEmision") ?? new Date(),
      fechaVencimiento: fechaVencimientoCalculada ?? optionalDate(formData, "fechaVencimiento") ?? new Date()
    }
  });
  revalidatePath(`/proyectos/${proyectoId}`);
}

export async function crearModificacion(proyectoId: number, formData: FormData) {
  await requireUser();
  const contrato = await prisma.contrato.findUniqueOrThrow({ where: { proyectoId } });
  const variacionMonto = numberValue(formData, "variacionMonto");
  const variacionPlazoConsultorDias = numberValue(formData, "variacionPlazoConsultorDias");
  const variacionPlazoRevisionServiuDias = numberValue(formData, "variacionPlazoRevisionServiuDias");
  const nuevoMontoVigente = contrato.montoVigente + variacionMonto;
  if (nuevoMontoVigente < 0) throw new Error("La modificación no puede dejar el monto vigente final negativo.");
  const fechaModificacion = optionalDate(formData, "fecha");
  if (!fechaModificacion) throw new Error("La fecha de modificación es obligatoria.");
  const tipoModificacion = requiredText(formData, "tipo", "El tipo de modificación");

  const nuevaFechaTerminoVigente = calcularFechaTerminoContratoVigente(
    contrato.fechaTerminoVigente,
    variacionPlazoConsultorDias + variacionPlazoRevisionServiuDias
  );

  await prisma.$transaction([
    prisma.modificacionContractual.create({
      data: {
        proyectoId,
        tipo: tipoModificacion,
        fecha: fechaModificacion,
        resolucion: text(formData, "resolucion"),
        descripcion: text(formData, "descripcion"),
        variacionMonto,
        variacionPlazoConsultorDias,
        variacionPlazoRevisionServiuDias,
        nuevoMontoVigente,
        nuevaFechaTerminoVigente
      }
    }),
    prisma.contrato.update({
      where: { proyectoId },
      data: {
        montoVigente: nuevoMontoVigente,
        plazoConsultorDias: contrato.plazoConsultorDias + variacionPlazoConsultorDias,
        plazoRevisionServiuDias: contrato.plazoRevisionServiuDias + variacionPlazoRevisionServiuDias,
        plazoTotalDias: contrato.plazoTotalDias + variacionPlazoConsultorDias + variacionPlazoRevisionServiuDias,
        fechaTerminoVigente: nuevaFechaTerminoVigente
      }
    })
  ]);

  await recalcularMontosHitos(proyectoId);
  await recalcularFechaGarantia(proyectoId);
  revalidatePath(`/proyectos/${proyectoId}`);
}

export async function crearTipoEstudio(formData: FormData) {
  await requireAdmin();
  await prisma.tipoEstudio.create({ data: { nombre: text(formData, "nombre"), activo: true } });
  revalidatePath("/catalogos");
}

export async function alternarTipoEstudio(id: number, activo: boolean) {
  await requireAdmin();
  await prisma.tipoEstudio.update({ where: { id }, data: { activo } });
  revalidatePath("/catalogos");
}

export async function resolverAlerta(proyectoId: number, tipo: string, severidad: string, mensaje: string, formData: FormData) {
  await requireUser();
  const comentario = text(formData, "comentarioResolucion") || null;
  const existente = await prisma.alerta.findFirst({
    where: { proyectoId, tipo, mensaje },
    orderBy: { createdAt: "desc" }
  });

  if (existente) {
    await prisma.alerta.update({
      where: { id: existente.id },
      data: { resuelta: true, fechaResolucion: new Date(), comentarioResolucion: comentario }
    });
  } else {
    await prisma.alerta.create({
      data: {
        proyectoId,
        tipo,
        severidad,
        mensaje,
        resuelta: true,
        fechaResolucion: new Date(),
        comentarioResolucion: comentario
      }
    });
  }

  revalidatePath("/alertas");
  revalidatePath(`/proyectos/${proyectoId}`);
}

async function recalcularMontosHitos(proyectoId: number) {
  const contrato = await prisma.contrato.findUnique({ where: { proyectoId } });
  if (!contrato) return;
  const hitos = await prisma.hito.findMany({ where: { proyectoId } });
  await Promise.all(
    hitos.map((hito) =>
      prisma.hito.update({
        where: { id: hito.id },
        data: { montoProgramado: calcularMontoProgramado(contrato.montoVigente, hito.porcentajePago) }
      })
    )
  );
}

async function recalcularFechaGarantia(proyectoId: number) {
  const proyecto = await prisma.proyectoEstudio.findUnique({
    where: { id: proyectoId },
    include: { garantia: true }
  });
  if (!proyecto?.garantia) return;

  const fechaVencimiento = await obtenerFechaVencimientoGarantiaCalculada(proyectoId);
  if (!fechaVencimiento) return;

  await prisma.garantia.update({
    where: { proyectoId },
    data: { fechaVencimiento }
  });
}

async function obtenerFechaVencimientoGarantiaCalculada(proyectoId: number) {
  const proyecto = await prisma.proyectoEstudio.findUnique({
    where: { id: proyectoId },
    include: { contrato: true }
  });
  if (!proyecto?.contrato) return null;

  return calcularFechaVencimientoGarantiaProyecto(proyecto);
}
