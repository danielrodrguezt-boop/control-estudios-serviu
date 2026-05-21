import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { avanceFinancieroProyecto, avanceFisicoProyecto, advertenciasConsistencia, calcularFechaVencimientoGarantiaProyecto, detectarAnomalias, estadoContratoCalculado, estadoGarantiaCalculado, estadoHitoCalculado, generarAlertasCalculadas, garantiaEvaluada, nivelRiesgoOperativo, prioridadProyecto, saldoPendienteProyecto } from "@/lib/business/rules";
import { estadoContratoLabel, estadoGarantiaLabel, estadoHitoLabel, estadoProyectoLabel, tipoAlertaLabel, tipoModificacionLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export async function excelCartera() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cartera");
  sheet.columns = [
    { header: "Código BIP", key: "codigoBip", width: 16 },
    { header: "Nombre", key: "nombre", width: 42 },
    { header: "Tipo", key: "tipo", width: 24 },
    { header: "Comuna", key: "comuna", width: 18 },
    { header: "Estado", key: "estado", width: 24 },
    { header: "Crítico", key: "critico", width: 12 },
    { header: "Consultora", key: "consultora", width: 28 },
    { header: "Fecha término contrato vigente", key: "fechaTerminoVigente", width: 24 },
    { header: "Fecha vencimiento garantía calculada", key: "fechaVencimientoGarantia", width: 30 },
    { header: "Nivel riesgo operativo", key: "riesgo", width: 20 },
    { header: "Avance físico", key: "avanceFisico", width: 16 },
    { header: "Avance financiero", key: "avanceFinanciero", width: 18 },
    { header: "Alertas activas", key: "alertas", width: 16 },
    { header: "Monto original", key: "montoOriginal", width: 18 },
    { header: "Monto vigente", key: "montoVigente", width: 18 },
    { header: "Saldo pendiente", key: "saldoPendiente", width: 18 }
  ];
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true } });
  proyectos.forEach((p) => {
    const garantia = garantiaEvaluada(p);
    sheet.addRow({
      codigoBip: p.codigoBip,
      nombre: p.nombre,
      tipo: p.tipoEstudio.nombre,
      comuna: p.comuna,
      estado: estadoProyectoLabel[p.estado],
      critico: p.esCriticoManual ? "Sí" : "No",
      consultora: p.contrato?.nombreConsultora ?? "",
      fechaTerminoVigente: formatDate(p.contrato?.fechaTerminoVigente),
      fechaVencimientoGarantia: formatDate(garantia?.fechaVencimiento),
      riesgo: nivelRiesgoOperativo(p),
      avanceFisico: avanceFisicoProyecto(p.hitos),
      avanceFinanciero: avanceFinancieroProyecto(p.hitos, p.contrato),
      alertas: generarAlertasCalculadas(p).length,
      montoOriginal: p.contrato?.montoOriginal ?? 0,
      montoVigente: p.contrato?.montoVigente ?? 0,
      saldoPendiente: saldoPendienteProyecto(p.hitos, p.contrato)
    });
  });
  styleSheet(sheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelHitos() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hitos y pagos");
  sheet.columns = [
    { header: "Proyecto", key: "proyecto", width: 36 },
    { header: "Código BIP", key: "codigoBip", width: 16 },
    { header: "N°", key: "numero", width: 8 },
    { header: "Hito", key: "hito", width: 30 },
    { header: "% pago", key: "porcentaje", width: 12 },
    { header: "Monto programado", key: "programado", width: 18 },
    { header: "Monto cobrado", key: "cobrado", width: 18 },
    { header: "Monto pagado", key: "pagado", width: 18 },
    { header: "Estado", key: "estado", width: 24 }
  ];
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { contrato: true, hitos: { orderBy: { numero: "asc" } } } });
  proyectos.forEach((p) =>
    p.hitos.forEach((h) =>
      sheet.addRow({
        proyecto: p.nombre,
        codigoBip: p.codigoBip,
        numero: h.numero,
        hito: h.nombre,
        porcentaje: h.porcentajePago,
        programado: h.montoProgramado,
        cobrado: h.montoCobrado,
        pagado: h.montoPagado,
        estado: estadoHitoLabel[estadoHitoCalculado(h, p.contrato)]
      })
    )
  );
  styleSheet(sheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelAlertas() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Alertas");
  sheet.columns = [
    { header: "Proyecto", key: "proyecto", width: 38 },
    { header: "Código BIP", key: "codigoBip", width: 16 },
    { header: "Tipo", key: "tipo", width: 30 },
    { header: "Severidad", key: "severidad", width: 14 },
    { header: "Mensaje", key: "mensaje", width: 70 }
  ];
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { contrato: true, garantia: true, hitos: true } });
  proyectos.forEach((p) =>
    generarAlertasCalculadas(p).forEach((a) =>
      sheet.addRow({
        proyecto: p.nombre,
        codigoBip: p.codigoBip,
        tipo: tipoAlertaLabel[a.tipo],
        severidad: a.severidad,
        mensaje: a.mensaje
      })
    )
  );
  styleSheet(sheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelBaseCompleta() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Control Estudios SERVIU";
  workbook.created = new Date();

  const [proyectos, contratos, hitos, garantias, modificaciones, alertasPersistidas, tipos] = await Promise.all([
    prisma.proyectoEstudio.findMany({ include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true } }),
    prisma.contrato.findMany({ include: { proyecto: true } }),
    prisma.hito.findMany({ include: { proyecto: { include: { contrato: true } } }, orderBy: [{ proyectoId: "asc" }, { numero: "asc" }] }),
    prisma.garantia.findMany({ include: { proyecto: { include: { contrato: true } } } }),
    prisma.modificacionContractual.findMany({ include: { proyecto: true }, orderBy: { fecha: "asc" } }),
    prisma.alerta.findMany({ include: { proyecto: true }, orderBy: { fechaDeteccion: "desc" } }),
    prisma.tipoEstudio.findMany({ orderBy: { nombre: "asc" } })
  ]);

  const proyectosSheet = workbook.addWorksheet("Proyectos");
  proyectosSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Código BIP", key: "codigoBip", width: 16 },
    { header: "Nombre", key: "nombre", width: 44 },
    { header: "Tipo estudio", key: "tipoEstudio", width: 26 },
    { header: "Comuna", key: "comuna", width: 18 },
    { header: "Estado", key: "estado", width: 26 },
    { header: "Crítico manual", key: "critico", width: 16 },
    { header: "Resolución bases", key: "resolucionBases", width: 22 },
    { header: "Fecha resolución bases", key: "fechaResolucionBases", width: 20 },
    { header: "Número estados pago", key: "numeroEstadosPago", width: 20 },
    { header: "Porcentaje garantía", key: "porcentajeGarantia", width: 20 },
    { header: "Plazo garantía días", key: "plazoGarantiaDias", width: 20 },
    { header: "Observaciones", key: "observaciones", width: 48 },
    { header: "Creado", key: "createdAt", width: 16 },
    { header: "Actualizado", key: "updatedAt", width: 16 },
    { header: "Nivel riesgo operativo", key: "riesgo", width: 22 },
    { header: "Avance físico", key: "avanceFisico", width: 16 },
    { header: "Avance financiero", key: "avanceFinanciero", width: 18 },
    { header: "Alertas activas", key: "alertas", width: 16 },
    { header: "Advertencias", key: "advertencias", width: 60 }
  ];
  proyectos.forEach((p) => proyectosSheet.addRow({
    id: p.id,
    codigoBip: p.codigoBip,
    nombre: p.nombre,
    tipoEstudio: p.tipoEstudio.nombre,
    comuna: p.comuna,
    estado: estadoProyectoLabel[p.estado] ?? p.estado,
    critico: p.esCriticoManual ? "Sí" : "No",
    resolucionBases: p.resolucionBases ?? "",
    fechaResolucionBases: formatDate(p.fechaResolucionBases),
    numeroEstadosPago: p.numeroEstadosPago,
    porcentajeGarantia: p.porcentajeGarantia,
    plazoGarantiaDias: p.plazoGarantiaDias,
    observaciones: p.observacionesGenerales ?? "",
    createdAt: formatDate(p.createdAt),
    updatedAt: formatDate(p.updatedAt),
    riesgo: nivelRiesgoOperativo(p),
    avanceFisico: avanceFisicoProyecto(p.hitos),
    avanceFinanciero: avanceFinancieroProyecto(p.hitos, p.contrato),
    alertas: generarAlertasCalculadas(p).length,
    advertencias: advertenciasConsistencia(p).join(" ")
  }));

  const contratosSheet = workbook.addWorksheet("Contratos");
  contratosSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Proyecto ID", key: "proyectoId", width: 12 },
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Consultora", key: "consultora", width: 28 },
    { header: "Jefe/a proyecto", key: "jefe", width: 24 },
    { header: "Monto original", key: "montoOriginal", width: 18 },
    { header: "Monto vigente", key: "montoVigente", width: 18 },
    { header: "Plazo consultor días", key: "plazoConsultorDias", width: 20 },
    { header: "Plazo revisión SERVIU días", key: "plazoRevisionServiuDias", width: 24 },
    { header: "Plazo total días", key: "plazoTotalDias", width: 18 },
    { header: "Fecha inicio", key: "fechaInicio", width: 16 },
    { header: "Fecha término contractual", key: "fechaTerminoContractual", width: 24 },
    { header: "Fecha término vigente", key: "fechaTerminoVigente", width: 22 },
    { header: "Estado alerta contrato", key: "estadoContrato", width: 24 },
    { header: "Creado", key: "createdAt", width: 16 },
    { header: "Actualizado", key: "updatedAt", width: 16 }
  ];
  contratos.forEach((c) => {
    const estado = estadoContratoCalculado(c);
    contratosSheet.addRow({
      id: c.id,
      proyectoId: c.proyectoId,
      proyecto: c.proyecto.nombre,
      consultora: c.nombreConsultora,
      jefe: c.jefeProyecto,
      montoOriginal: c.montoOriginal,
      montoVigente: c.montoVigente,
      plazoConsultorDias: c.plazoConsultorDias,
      plazoRevisionServiuDias: c.plazoRevisionServiuDias,
      plazoTotalDias: c.plazoTotalDias,
      fechaInicio: formatDate(c.fechaInicio),
      fechaTerminoContractual: formatDate(c.fechaTerminoContractual),
      fechaTerminoVigente: formatDate(c.fechaTerminoVigente),
      estadoContrato: estadoContratoLabel[estado] ?? estado,
      createdAt: formatDate(c.createdAt),
      updatedAt: formatDate(c.updatedAt)
    });
  });

  const hitosSheet = workbook.addWorksheet("Hitos y Estados de pago");
  hitosSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Proyecto ID", key: "proyectoId", width: 12 },
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Número", key: "numero", width: 10 },
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Final", key: "final", width: 10 },
    { header: "% pago", key: "porcentajePago", width: 12 },
    { header: "Monto programado", key: "montoProgramado", width: 18 },
    { header: "Entrega programada", key: "fechaEntregaProgramada", width: 20 },
    { header: "Entrega real", key: "fechaEntregaReal", width: 16 },
    { header: "Observaciones", key: "fechaObservaciones", width: 16 },
    { header: "Correcciones", key: "fechaCorrecciones", width: 16 },
    { header: "Aprobación", key: "fechaAprobacion", width: 16 },
    { header: "Estado calculado", key: "estado", width: 24 },
    { header: "Multa aplica", key: "multaAplica", width: 14 },
    { header: "Monto multa", key: "montoMulta", width: 16 },
    { header: "Monto cobrado", key: "montoCobrado", width: 16 },
    { header: "Monto pagado", key: "montoPagado", width: 16 }
  ];
  hitos.forEach((h) => {
    const estado = estadoHitoCalculado(h, h.proyecto.contrato);
    hitosSheet.addRow({
      id: h.id,
      proyectoId: h.proyectoId,
      proyecto: h.proyecto.nombre,
      numero: h.numero,
      nombre: h.nombre,
      final: h.esFinal ? "Sí" : "No",
      porcentajePago: h.porcentajePago,
      montoProgramado: h.montoProgramado,
      fechaEntregaProgramada: formatDate(h.fechaEntregaProgramada),
      fechaEntregaReal: formatDate(h.fechaEntregaReal),
      fechaObservaciones: formatDate(h.fechaObservaciones),
      fechaCorrecciones: formatDate(h.fechaCorrecciones),
      fechaAprobacion: formatDate(h.fechaAprobacion),
      estado: estadoHitoLabel[estado] ?? estado,
      multaAplica: h.multaAplica ? "Sí" : "No",
      montoMulta: h.montoMulta,
      montoCobrado: h.montoCobrado,
      montoPagado: h.montoPagado
    });
  });

  const garantiasSheet = workbook.addWorksheet("Garantías");
  garantiasSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Proyecto ID", key: "proyectoId", width: 12 },
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Tipo", key: "tipo", width: 20 },
    { header: "Folio", key: "folio", width: 18 },
    { header: "Monto", key: "monto", width: 16 },
    { header: "Fecha emisión", key: "fechaEmision", width: 16 },
    { header: "Fecha vencimiento", key: "fechaVencimiento", width: 18 },
    { header: "Estado alerta garantía", key: "estado", width: 24 },
    { header: "Creado", key: "createdAt", width: 16 },
    { header: "Actualizado", key: "updatedAt", width: 16 }
  ];
  garantias.forEach((g) => {
    const fechaVencimiento = calcularFechaVencimientoGarantiaProyecto(g.proyecto) ?? g.fechaVencimiento;
    const estado = estadoGarantiaCalculado({ ...g, fechaVencimiento });
    garantiasSheet.addRow({
      id: g.id,
      proyectoId: g.proyectoId,
      proyecto: g.proyecto.nombre,
      tipo: g.tipo,
      folio: g.folio,
      monto: g.monto,
      fechaEmision: formatDate(g.fechaEmision),
      fechaVencimiento: formatDate(fechaVencimiento),
      estado: estadoGarantiaLabel[estado] ?? estado,
      createdAt: formatDate(g.createdAt),
      updatedAt: formatDate(g.updatedAt)
    });
  });

  const modificacionesSheet = workbook.addWorksheet("Modificaciones contractuales");
  modificacionesSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Proyecto ID", key: "proyectoId", width: 12 },
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Tipo", key: "tipo", width: 24 },
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Resolución", key: "resolucion", width: 22 },
    { header: "Descripción", key: "descripcion", width: 50 },
    { header: "Variación monto", key: "variacionMonto", width: 18 },
    { header: "Variación plazo consultor", key: "variacionPlazoConsultorDias", width: 24 },
    { header: "Variación plazo revisión", key: "variacionPlazoRevisionServiuDias", width: 24 },
    { header: "Nuevo monto vigente", key: "nuevoMontoVigente", width: 20 },
    { header: "Nueva fecha término vigente", key: "nuevaFechaTerminoVigente", width: 26 },
    { header: "Creado", key: "createdAt", width: 16 }
  ];
  modificaciones.forEach((m) => modificacionesSheet.addRow({
    id: m.id,
    proyectoId: m.proyectoId,
    proyecto: m.proyecto.nombre,
    tipo: tipoModificacionLabel[m.tipo] ?? m.tipo,
    fecha: formatDate(m.fecha),
    resolucion: m.resolucion,
    descripcion: m.descripcion,
    variacionMonto: m.variacionMonto,
    variacionPlazoConsultorDias: m.variacionPlazoConsultorDias,
    variacionPlazoRevisionServiuDias: m.variacionPlazoRevisionServiuDias,
    nuevoMontoVigente: m.nuevoMontoVigente,
    nuevaFechaTerminoVigente: formatDate(m.nuevaFechaTerminoVigente),
    createdAt: formatDate(m.createdAt)
  }));

  const alertasSheet = workbook.addWorksheet("Alertas");
  alertasSheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Origen", key: "origen", width: 14 },
    { header: "Proyecto ID", key: "proyectoId", width: 12 },
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Código BIP", key: "codigoBip", width: 16 },
    { header: "Tipo", key: "tipo", width: 32 },
    { header: "Severidad", key: "severidad", width: 14 },
    { header: "Mensaje", key: "mensaje", width: 70 },
    { header: "Fecha detección", key: "fechaDeteccion", width: 18 },
    { header: "Resuelta", key: "resuelta", width: 12 },
    { header: "Creado", key: "createdAt", width: 16 }
  ];
  alertasPersistidas.forEach((a) => alertasSheet.addRow({
    id: a.id,
    origen: "Persistida",
    proyectoId: a.proyectoId,
    proyecto: a.proyecto.nombre,
    codigoBip: a.proyecto.codigoBip,
    tipo: tipoAlertaLabel[a.tipo] ?? a.tipo,
    severidad: a.severidad,
    mensaje: a.mensaje,
    fechaDeteccion: formatDate(a.fechaDeteccion),
    resuelta: a.resuelta ? "Sí" : "No",
    createdAt: formatDate(a.createdAt)
  }));
  proyectos.forEach((p) => generarAlertasCalculadas(p).forEach((a) => alertasSheet.addRow({
    id: "",
    origen: "Calculada",
    proyectoId: p.id,
    proyecto: p.nombre,
    codigoBip: p.codigoBip,
    tipo: tipoAlertaLabel[a.tipo] ?? a.tipo,
    severidad: a.severidad,
    mensaje: a.mensaje,
    fechaDeteccion: formatDate(new Date()),
    resuelta: "No",
    createdAt: ""
  })));

  const tiposSheet = workbook.addWorksheet("Tipos de estudio");
  tiposSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Nombre", key: "nombre", width: 32 },
    { header: "Activo", key: "activo", width: 12 }
  ];
  tipos.forEach((t) => tiposSheet.addRow({ id: t.id, nombre: t.nombre, activo: t.activo ? "Sí" : "No" }));

  workbook.eachSheet(styleSheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelDashboardEjecutivo() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Control Estudios SERVIU";
  workbook.created = new Date();

  const proyectos = await prisma.proyectoEstudio.findMany({
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true },
    orderBy: { updatedAt: "desc" }
  });

  const resumenes = proyectos.map((proyecto) => {
    const alertas = generarAlertasCalculadas(proyecto);
    const riesgo = nivelRiesgoOperativo(proyecto);
    const prioridad = prioridadProyecto(proyecto);
    const garantia = garantiaEvaluada(proyecto);
    const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia) : "";
    const estadoContrato = proyecto.contrato ? estadoContratoCalculado(proyecto.contrato) : "";
    return {
      proyecto,
      alertas,
      riesgo,
      prioridad,
      garantia,
      estadoGarantia,
      estadoContrato,
      avanceFisico: avanceFisicoProyecto(proyecto.hitos),
      avanceFinanciero: avanceFinancieroProyecto(proyecto.hitos, proyecto.contrato)
    };
  });

  const montoContratado = resumenes.reduce((sum, r) => sum + (r.proyecto.contrato?.montoOriginal ?? 0), 0);
  const montoVigente = resumenes.reduce((sum, r) => sum + (r.proyecto.contrato?.montoVigente ?? 0), 0);
  const montoPagado = resumenes.flatMap((r) => r.proyecto.hitos).reduce((sum, h) => sum + h.montoPagado, 0);

  const resumenSheet = workbook.addWorksheet("Resumen ejecutivo");
  resumenSheet.columns = [{ header: "Indicador", key: "indicador", width: 38 }, { header: "Valor", key: "valor", width: 24 }];
  [
    ["Total proyectos", resumenes.length],
    ["Riesgo alto", resumenes.filter((r) => r.riesgo === "ALTO").length],
    ["Riesgo medio", resumenes.filter((r) => r.riesgo === "MEDIO").length],
    ["Garantías vencidas", resumenes.filter((r) => r.estadoGarantia === "VENCIDA").length],
    ["Contratos vencidos", resumenes.filter((r) => r.estadoContrato === "VENCIDO").length],
    ["Monto vigente total", montoVigente],
    ["Saldo pendiente total", montoVigente - montoPagado]
  ].forEach(([indicador, valor]) => resumenSheet.addRow({ indicador, valor }));

  const kpiSheet = workbook.addWorksheet("KPIs");
  kpiSheet.columns = [{ header: "Categoría", key: "categoria", width: 22 }, { header: "KPI", key: "kpi", width: 36 }, { header: "Valor", key: "valor", width: 24 }];
  [
    ["Operación", "Total proyectos", resumenes.length],
    ["Operación", "Proyectos críticos manuales", resumenes.filter((r) => r.proyecto.esCriticoManual).length],
    ["Operación", "Riesgo alto", resumenes.filter((r) => r.riesgo === "ALTO").length],
    ["Operación", "Atrasos consultora", resumenes.flatMap((r) => r.alertas).filter((a) => a.responsable === "Consultora").length],
    ["Operación", "Atrasos SERVIU", resumenes.flatMap((r) => r.alertas).filter((a) => a.responsable === "SERVIU").length],
    ["Finanzas", "Monto contratado total", montoContratado],
    ["Finanzas", "Monto vigente total", montoVigente],
    ["Finanzas", "Monto pagado total", montoPagado],
    ["Finanzas", "Saldo pendiente total", montoVigente - montoPagado],
    ["Gestión", "Consultoras activas", new Set(resumenes.map((r) => r.proyecto.contrato?.nombreConsultora).filter(Boolean)).size],
    ["Gestión", "Comunas activas", new Set(resumenes.map((r) => r.proyecto.comuna)).size],
    ["Gestión", "Proyectos con alertas", resumenes.filter((r) => r.alertas.length > 0).length]
  ].forEach(([categoria, kpi, valor]) => kpiSheet.addRow({ categoria, kpi, valor }));

  const priorizadosSheet = workbook.addWorksheet("Proyectos priorizados");
  priorizadosSheet.columns = [
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Código BIP", key: "codigoBip", width: 16 },
    { header: "Consultora", key: "consultora", width: 28 },
    { header: "Riesgo", key: "riesgo", width: 14 },
    { header: "Puntaje prioridad", key: "puntaje", width: 18 },
    { header: "Causa principal", key: "causa", width: 28 },
    { header: "Severidad", key: "severidad", width: 14 },
    { header: "Acción sugerida", key: "accion", width: 42 }
  ];
  resumenes
    .filter((r) => r.prioridad.puntaje > 0)
    .sort((a, b) => b.prioridad.puntaje - a.prioridad.puntaje)
    .forEach((r) => priorizadosSheet.addRow({
      proyecto: r.proyecto.nombre,
      codigoBip: r.proyecto.codigoBip,
      consultora: r.proyecto.contrato?.nombreConsultora ?? "",
      riesgo: r.riesgo,
      puntaje: r.prioridad.puntaje,
      causa: r.prioridad.causaPrincipal,
      severidad: r.prioridad.severidad,
      accion: r.prioridad.accionSugerida
    }));

  const riesgosSheet = workbook.addWorksheet("Riesgos");
  riesgosSheet.columns = [
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Comuna", key: "comuna", width: 18 },
    { header: "Consultora", key: "consultora", width: 28 },
    { header: "Riesgo", key: "riesgo", width: 14 },
    { header: "Avance físico", key: "avanceFisico", width: 16 },
    { header: "Avance financiero", key: "avanceFinanciero", width: 18 },
    { header: "Alertas", key: "alertas", width: 12 }
  ];
  resumenes.forEach((r) => riesgosSheet.addRow({
    proyecto: r.proyecto.nombre,
    comuna: r.proyecto.comuna,
    consultora: r.proyecto.contrato?.nombreConsultora ?? "",
    riesgo: r.riesgo,
    avanceFisico: r.avanceFisico,
    avanceFinanciero: r.avanceFinanciero,
    alertas: r.alertas.length
  }));

  const alertasSheet = workbook.addWorksheet("Alertas activas");
  alertasSheet.columns = [
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Código BIP", key: "codigoBip", width: 16 },
    { header: "Tipo", key: "tipo", width: 32 },
    { header: "Severidad", key: "severidad", width: 14 },
    { header: "Responsable", key: "responsable", width: 18 },
    { header: "Días atraso", key: "dias", width: 14 },
    { header: "Mensaje", key: "mensaje", width: 70 }
  ];
  resumenes.forEach((r) => r.alertas.forEach((a) => alertasSheet.addRow({
    proyecto: r.proyecto.nombre,
    codigoBip: r.proyecto.codigoBip,
    tipo: tipoAlertaLabel[a.tipo] ?? a.tipo,
    severidad: a.severidad,
    responsable: a.responsable,
    dias: a.diasAtraso,
    mensaje: a.mensaje
  })));

  workbook.eachSheet(styleSheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelAnomalias() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Anomalias");
  sheet.columns = [
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Codigo BIP", key: "codigoBip", width: 16 },
    { header: "Comuna", key: "comuna", width: 18 },
    { header: "Tipo anomalia", key: "tipo", width: 30 },
    { header: "Severidad", key: "severidad", width: 14 },
    { header: "Mensaje", key: "mensaje", width: 70 },
    { header: "Accion sugerida", key: "accion", width: 48 }
  ];
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true } });
  proyectos.forEach((p) => advertenciasConsistencia(p).forEach((mensaje) => sheet.addRow({
    proyecto: p.nombre,
    codigoBip: p.codigoBip,
    comuna: p.comuna,
    tipo: "Advertencia de consistencia",
    severidad: "MEDIA",
    mensaje,
    accion: "Revisar ficha del proyecto"
  })));
  proyectos.forEach((p) => detectarAnomalias(p).forEach((a) => sheet.addRow({
    proyecto: p.nombre,
    codigoBip: p.codigoBip,
    comuna: p.comuna,
    tipo: a.tipo,
    severidad: a.severidad,
    mensaje: a.mensaje,
    accion: a.accionSugerida
  })));
  styleSheet(sheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelComparativoProyectos(ids?: number[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Comparativo proyectos");
  sheet.columns = [
    { header: "Codigo BIP", key: "codigoBip", width: 16 },
    { header: "Proyecto", key: "proyecto", width: 42 },
    { header: "Consultora", key: "consultora", width: 28 },
    { header: "Comuna", key: "comuna", width: 18 },
    { header: "Tipo estudio", key: "tipo", width: 24 },
    { header: "Monto vigente", key: "montoVigente", width: 18 },
    { header: "Avance fisico", key: "avanceFisico", width: 16 },
    { header: "Avance financiero", key: "avanceFinanciero", width: 18 },
    { header: "Riesgo", key: "riesgo", width: 12 },
    { header: "Alertas", key: "alertas", width: 12 },
    { header: "Garantia vence", key: "garantia", width: 18 }
  ];
  const proyectos = await prisma.proyectoEstudio.findMany({
    where: ids?.length ? { id: { in: ids } } : undefined,
    include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true }
  });
  proyectos.forEach((p) => {
    const garantia = garantiaEvaluada(p);
    sheet.addRow({
      codigoBip: p.codigoBip,
      proyecto: p.nombre,
      consultora: p.contrato?.nombreConsultora ?? "",
      comuna: p.comuna,
      tipo: p.tipoEstudio.nombre,
      montoVigente: p.contrato?.montoVigente ?? 0,
      avanceFisico: avanceFisicoProyecto(p.hitos),
      avanceFinanciero: avanceFinancieroProyecto(p.hitos, p.contrato),
      riesgo: nivelRiesgoOperativo(p),
      alertas: generarAlertasCalculadas(p).length,
      garantia: formatDate(garantia?.fechaVencimiento)
    });
  });
  styleSheet(sheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelDesempenoConsultoras() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Desempeno consultoras");
  sheet.columns = [
    { header: "Consultora", key: "consultora", width: 30 },
    { header: "Proyectos", key: "proyectos", width: 12 },
    { header: "Monto vigente", key: "monto", width: 18 },
    { header: "Avance fisico promedio", key: "avanceFisico", width: 22 },
    { header: "Avance financiero promedio", key: "avanceFinanciero", width: 24 },
    { header: "Atrasos consultora", key: "atrasos", width: 18 },
    { header: "Alertas activas", key: "alertas", width: 16 },
    { header: "Garantias", key: "garantias", width: 12 }
  ];
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { contrato: true, garantia: true, hitos: true } });
  const grupos = new Map<string, typeof proyectos>();
  proyectos.forEach((p) => {
    const key = p.contrato?.nombreConsultora ?? "Sin consultora";
    grupos.set(key, [...(grupos.get(key) ?? []), p]);
  });
  grupos.forEach((items, consultora) => {
    const alertas = items.flatMap((p) => generarAlertasCalculadas(p));
    sheet.addRow({
      consultora,
      proyectos: items.length,
      monto: items.reduce((sum, p) => sum + (p.contrato?.montoVigente ?? 0), 0),
      avanceFisico: promedioNumerico(items.map((p) => avanceFisicoProyecto(p.hitos))),
      avanceFinanciero: promedioNumerico(items.map((p) => avanceFinancieroProyecto(p.hitos, p.contrato))),
      atrasos: alertas.filter((a) => a.responsable === "Consultora").length,
      alertas: alertas.length,
      garantias: items.filter((p) => p.garantia).length
    });
  });
  styleSheet(sheet);
  return workbook.xlsx.writeBuffer();
}

export async function excelAnalisisTipoEstudio() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Analisis tipo estudio");
  sheet.columns = [
    { header: "Tipo estudio", key: "tipo", width: 28 },
    { header: "Proyectos", key: "proyectos", width: 12 },
    { header: "Monto vigente", key: "monto", width: 18 },
    { header: "Riesgo promedio", key: "riesgo", width: 18 },
    { header: "Avance fisico promedio", key: "avanceFisico", width: 22 },
    { header: "Avance financiero promedio", key: "avanceFinanciero", width: 24 },
    { header: "Atrasos", key: "atrasos", width: 12 },
    { header: "Alertas", key: "alertas", width: 12 }
  ];
  const proyectos = await prisma.proyectoEstudio.findMany({ include: { tipoEstudio: true, contrato: true, garantia: true, hitos: true } });
  const grupos = new Map<string, typeof proyectos>();
  proyectos.forEach((p) => {
    const key = p.tipoEstudio?.nombre ?? "Sin tipo";
    grupos.set(key, [...(grupos.get(key) ?? []), p]);
  });
  grupos.forEach((items, tipo) => {
    const alertas = items.flatMap((p) => generarAlertasCalculadas(p));
    sheet.addRow({
      tipo,
      proyectos: items.length,
      monto: items.reduce((sum, p) => sum + (p.contrato?.montoVigente ?? 0), 0),
      riesgo: promedioNumerico(items.map((p) => (nivelRiesgoOperativo(p) === "ALTO" ? 3 : nivelRiesgoOperativo(p) === "MEDIO" ? 2 : 1))),
      avanceFisico: promedioNumerico(items.map((p) => avanceFisicoProyecto(p.hitos))),
      avanceFinanciero: promedioNumerico(items.map((p) => avanceFinancieroProyecto(p.hitos, p.contrato))),
      atrasos: alertas.filter((a) => a.responsable === "Consultora" || a.responsable === "SERVIU").length,
      alertas: alertas.length
    });
  });
  styleSheet(sheet);
  return workbook.xlsx.writeBuffer();
}

function promedioNumerico(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E7490" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.eachRow((row) => row.eachCell((cell) => (cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } })));
}
