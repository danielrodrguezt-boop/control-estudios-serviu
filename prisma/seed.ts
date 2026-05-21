import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EstadoHito, EstadoProyecto, TipoModificacion } from "../lib/enums";

const prisma = new PrismaClient();

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monto(montoVigente: number, porcentaje: number) {
  return Math.round((montoVigente * porcentaje) / 100);
}

async function main() {
  await prisma.usuario.upsert({
    where: { email: "admin@serviu.local" },
    update: {
      nombre: "Administrador SERVIU",
      rol: "ADMIN",
      activo: true,
      passwordHash: await bcrypt.hash("Admin1234!", 12)
    },
    create: {
      nombre: "Administrador SERVIU",
      email: "admin@serviu.local",
      rol: "ADMIN",
      activo: true,
      passwordHash: await bcrypt.hash("Admin1234!", 12)
    }
  });

  await prisma.alerta.deleteMany();
  await prisma.modificacionContractual.deleteMany();
  await prisma.garantia.deleteMany();
  await prisma.hito.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.proyectoEstudio.deleteMany();
  await prisma.tipoEstudio.deleteMany();

  const prefactibilidad = await prisma.tipoEstudio.create({ data: { nombre: "Prefactibilidad", activo: true } });
  const disenoIngenieria = await prisma.tipoEstudio.create({ data: { nombre: "Diseño de ingeniería", activo: true } });
  const arquitectura = await prisma.tipoEstudio.create({ data: { nombre: "Arquitectura y especialidades", activo: true } });

  const p1 = await prisma.proyectoEstudio.create({
    data: {
      codigoBip: "40051234-0",
      nombre: "Diseño mejoramiento eje Los Carrera",
      tipoEstudioId: disenoIngenieria.id,
      comuna: "Concepción",
      estado: EstadoProyecto.EN_EJECUCION,
      esCriticoManual: true,
      resolucionBases: "Res. Ex. 1234/2025",
      fechaResolucionBases: new Date("2025-08-15"),
      numeroEstadosPago: 4,
      observacionesGenerales: "Proyecto prioritario por coordinación intersectorial."
    }
  });
  await prisma.contrato.create({
    data: {
      proyectoId: p1.id,
      nombreConsultora: "Sur Diseño SpA",
      jefeProyecto: "María González",
      montoOriginal: 180000000,
      montoVigente: 195000000,
      plazoConsultorDias: 220,
      plazoRevisionServiuDias: 25,
      plazoTotalDias: 245,
      fechaInicio: new Date("2025-09-01"),
      fechaTerminoContractual: new Date("2026-05-04"),
      fechaTerminoVigente: addDays(new Date(), 45)
    }
  });
  await prisma.hito.createMany({
    data: [
      { proyectoId: p1.id, numero: 1, nombre: "Diagnóstico", porcentajePago: 20, montoProgramado: monto(195000000, 20), fechaEntregaProgramada: new Date("2025-10-15"), fechaEntregaReal: new Date("2025-10-14"), fechaAprobacion: new Date("2025-11-02"), estado: EstadoHito.APROBADO, montoPagado: monto(195000000, 20), montoCobrado: monto(195000000, 20) },
      { proyectoId: p1.id, numero: 2, nombre: "Anteproyecto", porcentajePago: 30, montoProgramado: monto(195000000, 30), fechaEntregaProgramada: new Date("2026-01-15"), fechaEntregaReal: new Date("2026-01-20"), estado: EstadoHito.EN_REVISION_SERVIU, montoCobrado: monto(195000000, 30) },
      { proyectoId: p1.id, numero: 3, nombre: "Proyecto definitivo", porcentajePago: 30, montoProgramado: monto(195000000, 30), fechaEntregaProgramada: addDays(new Date(), -15), estado: EstadoHito.PENDIENTE },
      { proyectoId: p1.id, numero: 4, nombre: "Aprobaciones finales", esFinal: true, porcentajePago: 20, montoProgramado: monto(195000000, 20), fechaEntregaProgramada: addDays(new Date(), 70), estado: EstadoHito.PENDIENTE }
    ]
  });
  await prisma.garantia.create({ data: { proyectoId: p1.id, folio: "BG-88421", monto: 9750000, fechaEmision: new Date("2025-08-28"), fechaVencimiento: addDays(new Date(), 35) } });
  await prisma.modificacionContractual.create({
    data: {
      proyectoId: p1.id,
      tipo: TipoModificacion.MODIFICACION_MIXTA,
      fecha: new Date("2026-02-10"),
      resolucion: "Res. Ex. 452/2026",
      descripcion: "Ajuste de alcance por obras complementarias y ampliación de revisión.",
      variacionMonto: 15000000,
      variacionPlazoConsultorDias: 20,
      variacionPlazoRevisionServiuDias: 10,
      nuevoMontoVigente: 195000000,
      nuevaFechaTerminoVigente: addDays(new Date(), 45)
    }
  });

  const p2 = await prisma.proyectoEstudio.create({
    data: {
      codigoBip: "40057890-0",
      nombre: "Diseño conjunto habitacional Costa Norte",
      tipoEstudioId: arquitectura.id,
      comuna: "Talcahuano",
      estado: EstadoProyecto.CON_OBSERVACIONES,
      numeroEstadosPago: 3
    }
  });
  await prisma.contrato.create({
    data: {
      proyectoId: p2.id,
      nombreConsultora: "BioBío Arquitectos Ltda.",
      jefeProyecto: "Carlos Pérez",
      montoOriginal: 125000000,
      montoVigente: 125000000,
      plazoConsultorDias: 160,
      plazoRevisionServiuDias: 20,
      plazoTotalDias: 180,
      fechaInicio: new Date("2025-11-10"),
      fechaTerminoContractual: new Date("2026-05-09"),
      fechaTerminoVigente: addDays(new Date(), -5)
    }
  });
  await prisma.hito.createMany({
    data: [
      { proyectoId: p2.id, numero: 1, nombre: "Cabida y diagnóstico normativo", porcentajePago: 25, montoProgramado: monto(125000000, 25), fechaEntregaProgramada: new Date("2025-12-20"), fechaEntregaReal: new Date("2025-12-19"), fechaAprobacion: new Date("2026-01-05"), estado: EstadoHito.APROBADO, montoPagado: monto(125000000, 25) },
      { proyectoId: p2.id, numero: 2, nombre: "Anteproyecto arquitectura", porcentajePago: 35, montoProgramado: monto(125000000, 35), fechaEntregaProgramada: new Date("2026-03-15"), fechaEntregaReal: new Date("2026-03-18"), estado: EstadoHito.CON_OBSERVACIONES },
      { proyectoId: p2.id, numero: 3, nombre: "Especialidades", esFinal: true, porcentajePago: 35, montoProgramado: monto(125000000, 35), fechaEntregaProgramada: addDays(new Date(), 25), estado: EstadoHito.PENDIENTE }
    ]
  });
  await prisma.garantia.create({ data: { proyectoId: p2.id, folio: "BG-77410", monto: 6250000, fechaEmision: new Date("2025-11-01"), fechaVencimiento: addDays(new Date(), -2) } });

  const p3 = await prisma.proyectoEstudio.create({
    data: {
      codigoBip: "40060111-0",
      nombre: "Prefactibilidad parque urbano Ribera Sur",
      tipoEstudioId: prefactibilidad.id,
      comuna: "Chiguayante",
      estado: EstadoProyecto.ADJUDICADO,
      numeroEstadosPago: 2
    }
  });
  await prisma.contrato.create({
    data: {
      proyectoId: p3.id,
      nombreConsultora: "Territorio Consultores",
      jefeProyecto: "Ana Riquelme",
      montoOriginal: 72000000,
      montoVigente: 72000000,
      plazoConsultorDias: 100,
      plazoRevisionServiuDias: 15,
      plazoTotalDias: 115,
      fechaInicio: addDays(new Date(), -20),
      fechaTerminoContractual: addDays(new Date(), 95),
      fechaTerminoVigente: addDays(new Date(), 95)
    }
  });
  await prisma.hito.createMany({
    data: [
      { proyectoId: p3.id, numero: 1, nombre: "Levantamiento base", porcentajePago: 50, montoProgramado: monto(72000000, 50), fechaEntregaProgramada: addDays(new Date(), 20), estado: EstadoHito.PENDIENTE },
      { proyectoId: p3.id, numero: 2, nombre: "Informe prefactibilidad", esFinal: true, porcentajePago: 50, montoProgramado: monto(72000000, 50), fechaEntregaProgramada: addDays(new Date(), 85), estado: EstadoHito.PENDIENTE }
    ]
  });
  await prisma.garantia.create({ data: { proyectoId: p3.id, folio: "BG-99102", monto: 3600000, fechaEmision: addDays(new Date(), -22), fechaVencimiento: addDays(new Date(), 260) } });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
