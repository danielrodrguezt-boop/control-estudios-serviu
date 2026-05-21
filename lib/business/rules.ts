import type { Contrato, Garantia, Hito, ProyectoEstudio } from "@prisma/client";
import { EstadoContrato, EstadoGarantia, EstadoHito, SeveridadAlerta, TipoAlerta } from "@/lib/enums";

const MS_DIA = 24 * 60 * 60 * 1000;
export const VENTANA_ALERTA_DIAS = 60;

export type ResponsableAlerta = "Consultora" | "SERVIU" | "Contrato" | "Garantía" | "Proyecto";
export type NivelRiesgoOperativo = "BAJO" | "MEDIO" | "ALTO";

export type ProyectoConControl = ProyectoEstudio & {
  contrato: Contrato | null;
  garantia: Garantia | null;
  hitos: Hito[];
};

export type AlertaOperativaCalculada = {
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  mensaje: string;
  responsable: ResponsableAlerta;
  diasAtraso: number;
  fechaDeteccion: Date;
  estado: string;
};

export type PrioridadProyecto = {
  puntaje: number;
  causaPrincipal: string;
  severidad: SeveridadAlerta;
  accionSugerida: string;
};

export type AnomaliaOperativa = {
  tipo: string;
  severidad: SeveridadAlerta;
  mensaje: string;
  accionSugerida: string;
};

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function detectarAnomalias(proyecto: ProyectoConControl, today = new Date()): AnomaliaOperativa[] {
  const anomalias: AnomaliaOperativa[] = [];
  const pagadoTotal = proyecto.hitos.reduce((sum, hito) => sum + hito.montoPagado, 0);
  const sumaHitos = sumaPorcentajes(proyecto.hitos);
  const garantia = garantiaEvaluada(proyecto);
  const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia, today) : null;
  const estadoContrato = proyecto.contrato ? estadoContratoCalculado(proyecto.contrato, today) : null;
  const alertasCriticas = generarAlertasCalculadas(proyecto, today).filter((alerta) => alerta.severidad === SeveridadAlerta.CRITICA);

  if (!proyecto.contrato) {
    anomalias.push({ tipo: "Proyecto sin contrato", severidad: SeveridadAlerta.ALTA, mensaje: "El proyecto no tiene contrato registrado.", accionSugerida: "Registrar contrato y plazos vigentes" });
  }
  if (proyecto.contrato && proyecto.hitos.length === 0) {
    anomalias.push({ tipo: "Contrato sin hitos", severidad: SeveridadAlerta.ALTA, mensaje: "Existe contrato, pero no se han definido hitos ni estados de pago.", accionSugerida: "Crear hitos contractuales" });
  }
  if (proyecto.contrato && !proyecto.garantia) {
    anomalias.push({ tipo: "Garantia faltante", severidad: SeveridadAlerta.ALTA, mensaje: "El contrato vigente no tiene garantia registrada.", accionSugerida: "Registrar folio y monto de garantia" });
  }
  if (estadoGarantia === EstadoGarantia.VENCIDA) {
    anomalias.push({ tipo: "Garantia vencida", severidad: SeveridadAlerta.CRITICA, mensaje: "La garantia de fiel cumplimiento esta vencida.", accionSugerida: "Solicitar prorroga o gestionar cobro" });
  }
  if (proyecto.hitos.some((hito) => !hito.fechaEntregaProgramada)) {
    anomalias.push({ tipo: "Hitos sin fechas clave", severidad: SeveridadAlerta.MEDIA, mensaje: "Existen hitos sin fecha de entrega programada.", accionSugerida: "Completar fechas de programacion" });
  }
  if (proyecto.hitos.length > 0 && Math.abs(sumaHitos - 100) > 0.01) {
    anomalias.push({ tipo: "Porcentaje inconsistente", severidad: SeveridadAlerta.MEDIA, mensaje: `Los hitos suman ${sumaHitos.toFixed(1)}% en vez de 100%.`, accionSugerida: "Ajustar porcentajes de pago" });
  }
  if (proyecto.hitos.some((hito) => hito.montoPagado > hito.montoProgramado)) {
    anomalias.push({ tipo: "Pago mayor al programado", severidad: SeveridadAlerta.ALTA, mensaje: "Existe al menos un hito con monto pagado mayor al monto programado.", accionSugerida: "Revisar estado de pago asociado al hito" });
  }
  if (proyecto.contrato && pagadoTotal > proyecto.contrato.montoVigente) {
    anomalias.push({ tipo: "Pago mayor al contrato", severidad: SeveridadAlerta.CRITICA, mensaje: "El monto pagado total supera el monto vigente del contrato.", accionSugerida: "Revisar pagos y modificaciones contractuales" });
  }
  if (!proyecto.tipoEstudioId) {
    anomalias.push({ tipo: "Sin tipo de estudio", severidad: SeveridadAlerta.MEDIA, mensaje: "El proyecto no tiene tipo de estudio asociado.", accionSugerida: "Asignar tipo de estudio" });
  }
  if (!proyecto.comuna?.trim()) {
    anomalias.push({ tipo: "Sin comuna", severidad: SeveridadAlerta.MEDIA, mensaje: "El proyecto no tiene comuna registrada.", accionSugerida: "Completar comuna" });
  }
  if (estadoContrato === EstadoContrato.VENCIDO && !["CERRADO", "FINALIZADO", "RECEPCIONADO", "TERMINADO_ANTICIPADAMENTE"].includes(proyecto.estado)) {
    anomalias.push({ tipo: "Contrato vencido sin cierre", severidad: SeveridadAlerta.CRITICA, mensaje: "El contrato esta vencido y el proyecto no esta cerrado o terminado.", accionSugerida: "Regularizar cierre o modificacion de plazo" });
  }
  if (alertasCriticas.length > 0) {
    anomalias.push({ tipo: "Alertas criticas activas", severidad: SeveridadAlerta.CRITICA, mensaje: `Existen ${alertasCriticas.length} alertas criticas no resueltas por regla de negocio.`, accionSugerida: "Revisar panel de alertas y resolver gestion pendiente" });
  }

  return anomalias;
}

export function alertKey(projectId: number, tipo: string, mensaje: string) {
  return `${projectId}::${tipo}::${mensaje}`;
}

export function startOfDay(date: Date) {
  const clean = new Date(date);
  clean.setHours(0, 0, 0, 0);
  return clean;
}

export function daysUntil(date: Date, today = new Date()) {
  return Math.ceil((startOfDay(date).getTime() - startOfDay(today).getTime()) / MS_DIA);
}

export function calcularMontoProgramado(montoVigente: number, porcentajePago: number) {
  return Math.round((montoVigente * porcentajePago) / 100);
}

export function calcularFechaTerminoContratoVigente(fechaBase: Date, variacionPlazoDias: number) {
  return addDays(fechaBase, variacionPlazoDias);
}

export function calcularFechaVencimientoGarantia(fechaTerminoContratoVigente: Date, plazoGarantiaDias: number) {
  return addDays(fechaTerminoContratoVigente, plazoGarantiaDias);
}

export function calcularFechaVencimientoGarantiaProyecto(
  proyecto: Pick<ProyectoEstudio, "plazoGarantiaDias"> & {
    contrato: Pick<Contrato, "fechaTerminoVigente"> | null;
  }
) {
  if (!proyecto.contrato) return null;
  return calcularFechaVencimientoGarantia(proyecto.contrato.fechaTerminoVigente, proyecto.plazoGarantiaDias);
}

export function sumaPorcentajes(hitos: Pick<Hito, "porcentajePago">[]) {
  return hitos.reduce((sum, hito) => sum + hito.porcentajePago, 0);
}

export function estaAtrasadoConsultora(
  hito: Pick<Hito, "fechaEntregaProgramada" | "fechaEntregaReal">,
  today = new Date()
) {
  return !hito.fechaEntregaReal && startOfDay(hito.fechaEntregaProgramada) < startOfDay(today);
}

export function diasAtrasoConsultora(
  hito: Pick<Hito, "fechaEntregaProgramada" | "fechaEntregaReal">,
  today = new Date()
) {
  if (!estaAtrasadoConsultora(hito, today)) return 0;
  return Math.max(0, Math.floor((startOfDay(today).getTime() - startOfDay(hito.fechaEntregaProgramada).getTime()) / MS_DIA));
}

export function fechaLimiteRevisionServiu(
  hito: Pick<Hito, "fechaEntregaReal">,
  contrato: Pick<Contrato, "plazoRevisionServiuDias">
) {
  if (!hito.fechaEntregaReal) return null;
  return addDays(hito.fechaEntregaReal, contrato.plazoRevisionServiuDias);
}

export function estaAtrasadoServiu(
  hito: Pick<Hito, "fechaEntregaReal" | "fechaAprobacion">,
  contrato: Pick<Contrato, "plazoRevisionServiuDias">,
  today = new Date()
) {
  const fechaLimite = fechaLimiteRevisionServiu(hito, contrato);
  return Boolean(fechaLimite && !hito.fechaAprobacion && startOfDay(fechaLimite) < startOfDay(today));
}

export function diasAtrasoServiu(
  hito: Pick<Hito, "fechaEntregaReal" | "fechaAprobacion">,
  contrato: Pick<Contrato, "plazoRevisionServiuDias">,
  today = new Date()
) {
  if (!estaAtrasadoServiu(hito, contrato, today)) return 0;
  const fechaLimite = fechaLimiteRevisionServiu(hito, contrato);
  if (!fechaLimite) return 0;
  return Math.max(0, Math.floor((startOfDay(today).getTime() - startOfDay(fechaLimite).getTime()) / MS_DIA));
}

export function estadoGarantiaCalculado(garantia: Pick<Garantia, "fechaVencimiento" | "estado">, today = new Date()) {
  if ([EstadoGarantia.COBRADA, EstadoGarantia.COBRO_SOLICITADO, EstadoGarantia.PRORROGADA].includes(garantia.estado as never)) {
    return garantia.estado;
  }
  const dias = daysUntil(garantia.fechaVencimiento, today);
  if (dias < 0) return EstadoGarantia.VENCIDA;
  if (dias <= VENTANA_ALERTA_DIAS) return EstadoGarantia.PROXIMA_A_VENCER;
  return EstadoGarantia.VIGENTE;
}

export function estadoContratoCalculado(contrato: Pick<Contrato, "fechaTerminoVigente" | "estadoContrato">, today = new Date()) {
  if ([EstadoContrato.SUSPENDIDO, EstadoContrato.TERMINADO].includes(contrato.estadoContrato as never)) return contrato.estadoContrato;
  const dias = daysUntil(contrato.fechaTerminoVigente, today);
  if (dias < 0) return EstadoContrato.VENCIDO;
  if (dias <= VENTANA_ALERTA_DIAS) return EstadoContrato.PROXIMO_A_VENCER;
  return EstadoContrato.VIGENTE;
}

export function estadoHitoCalculado(hito: Hito, contrato: Contrato | null, today = new Date()) {
  if (hito.fechaAprobacion) return EstadoHito.APROBADO;
  if (contrato && estaAtrasadoServiu(hito, contrato, today)) return EstadoHito.ATRASADO_SERVIU;
  if (estaAtrasadoConsultora(hito, today)) return EstadoHito.ATRASADO_CONSULTORA;
  return hito.estado;
}

export function avanceFisicoProyecto(hitos: Pick<Hito, "porcentajePago" | "fechaAprobacion" | "estado">[]) {
  const total = sumaPorcentajes(hitos);
  if (total <= 0) return 0;
  const aprobado = hitos
    .filter((hito) => hito.fechaAprobacion || hito.estado === EstadoHito.APROBADO)
    .reduce((sum, hito) => sum + hito.porcentajePago, 0);
  return Math.round((aprobado / total) * 100);
}

export function avanceFinancieroProyecto(hitos: Pick<Hito, "montoPagado">[], contrato: Pick<Contrato, "montoVigente"> | null) {
  if (!contrato || contrato.montoVigente <= 0) return 0;
  const pagado = hitos.reduce((sum, hito) => sum + hito.montoPagado, 0);
  return Math.round((pagado / contrato.montoVigente) * 100);
}

export function saldoPendienteProyecto(hitos: Pick<Hito, "montoPagado">[], contrato: Pick<Contrato, "montoVigente"> | null) {
  if (!contrato) return 0;
  const pagado = hitos.reduce((sum, hito) => sum + hito.montoPagado, 0);
  return contrato.montoVigente - pagado;
}

export function advertenciasConsistencia(proyecto: ProyectoConControl) {
  const advertencias: string[] = [];
  const pagado = proyecto.hitos.reduce((sum, hito) => sum + hito.montoPagado, 0);

  if (proyecto.hitos.length > 0 && Math.abs(sumaPorcentajes(proyecto.hitos) - 100) > 0.01) {
    advertencias.push("La suma de porcentajes de hitos no es 100%.");
  }
  if (proyecto.contrato && pagado > proyecto.contrato.montoVigente) {
    advertencias.push("El monto pagado total supera el monto vigente del contrato.");
  }
  if (proyecto.contrato && proyecto.hitos.length === 0) {
    advertencias.push("Existe contrato sin hitos registrados.");
  }
  if (!proyecto.contrato) {
    advertencias.push("Existe proyecto sin contrato registrado.");
  }
  if (proyecto.plazoGarantiaDias < 0) {
    advertencias.push("El plazo de garantía no puede ser negativo.");
  }
  if (proyecto.contrato && !proyecto.garantia) {
    advertencias.push("Existe contrato vigente sin garantía registrada.");
  }

  return advertencias;
}

export function garantiaEvaluada(proyecto: ProyectoConControl) {
  if (!proyecto.garantia) return null;
  const fechaVencimiento = calcularFechaVencimientoGarantiaProyecto(proyecto) ?? proyecto.garantia.fechaVencimiento;
  return { ...proyecto.garantia, fechaVencimiento };
}

export function generarAlertasCalculadas(proyecto: ProyectoConControl, today = new Date()) {
  const alertas: AlertaOperativaCalculada[] = [];

  if (proyecto.contrato) {
    for (const hito of proyecto.hitos) {
      if (estaAtrasadoConsultora(hito, today)) {
        const dias = diasAtrasoConsultora(hito, today);
        alertas.push({
          tipo: TipoAlerta.HITO_ATRASADO_CONSULTORA,
          severidad: SeveridadAlerta.ALTA,
          mensaje: `${hito.nombre} venció el ${hito.fechaEntregaProgramada.toLocaleDateString("es-CL")} sin entrega real.`,
          responsable: "Consultora",
          diasAtraso: dias,
          fechaDeteccion: today,
          estado: "Activa"
        });
      }

      if (estaAtrasadoServiu(hito, proyecto.contrato, today)) {
        const dias = diasAtrasoServiu(hito, proyecto.contrato, today);
        alertas.push({
          tipo: TipoAlerta.REVISION_SERVIU_ATRASADA,
          severidad: dias > 15 ? SeveridadAlerta.ALTA : SeveridadAlerta.MEDIA,
          mensaje: `${hito.nombre} excedió el plazo de revisión SERVIU de ${proyecto.contrato.plazoRevisionServiuDias} días.`,
          responsable: "SERVIU",
          diasAtraso: dias,
          fechaDeteccion: today,
          estado: "Activa"
        });
      }
    }

    const estadoContrato = estadoContratoCalculado(proyecto.contrato, today);
    if (estadoContrato === EstadoContrato.PROXIMO_A_VENCER) {
      alertas.push({
        tipo: TipoAlerta.CONTRATO_PROXIMO_A_VENCER,
        severidad: SeveridadAlerta.MEDIA,
        mensaje: `El contrato vence en ${daysUntil(proyecto.contrato.fechaTerminoVigente, today)} días.`,
        responsable: "Contrato",
        diasAtraso: 0,
        fechaDeteccion: today,
        estado: "Activa"
      });
    }
    if (estadoContrato === EstadoContrato.VENCIDO) {
      alertas.push({
        tipo: TipoAlerta.CONTRATO_VENCIDO,
        severidad: SeveridadAlerta.CRITICA,
        mensaje: "El contrato se encuentra vencido según la fecha de término vigente.",
        responsable: "Contrato",
        diasAtraso: Math.abs(daysUntil(proyecto.contrato.fechaTerminoVigente, today)),
        fechaDeteccion: today,
        estado: "Activa"
      });
    }
  }

  const garantia = garantiaEvaluada(proyecto);
  if (garantia) {
    const estado = estadoGarantiaCalculado(garantia, today);
    if (estado === EstadoGarantia.PROXIMA_A_VENCER) {
      alertas.push({
        tipo: TipoAlerta.GARANTIA_PROXIMA_A_VENCER,
        severidad: SeveridadAlerta.MEDIA,
        mensaje: `La garantía vence en ${daysUntil(garantia.fechaVencimiento, today)} días.`,
        responsable: "Garantía",
        diasAtraso: 0,
        fechaDeteccion: today,
        estado: "Activa"
      });
    }
    if (estado === EstadoGarantia.VENCIDA) {
      alertas.push({
        tipo: TipoAlerta.GARANTIA_VENCIDA,
        severidad: SeveridadAlerta.CRITICA,
        mensaje: "La garantía de fiel cumplimiento se encuentra vencida.",
        responsable: "Garantía",
        diasAtraso: Math.abs(daysUntil(garantia.fechaVencimiento, today)),
        fechaDeteccion: today,
        estado: "Activa"
      });
    }
  }

  if (proyecto.hitos.length > 0 && Math.abs(sumaPorcentajes(proyecto.hitos) - 100) > 0.01) {
    alertas.push({
      tipo: TipoAlerta.HITOS_NO_SUMAN_100,
      severidad: SeveridadAlerta.MEDIA,
      mensaje: `Los porcentajes de pago suman ${sumaPorcentajes(proyecto.hitos).toFixed(1)}% y deberían sumar 100%.`,
      responsable: "Proyecto",
      diasAtraso: 0,
      fechaDeteccion: today,
      estado: "Activa"
    });
  }

  return alertas;
}

export function nivelRiesgoOperativo(proyecto: ProyectoConControl, today = new Date()): NivelRiesgoOperativo {
  const alertas = generarAlertasCalculadas(proyecto, today);
  const estadoContrato = proyecto.contrato ? estadoContratoCalculado(proyecto.contrato, today) : EstadoContrato.VIGENTE;
  const garantia = garantiaEvaluada(proyecto);
  const estadoGarantia = garantia ? estadoGarantiaCalculado(garantia, today) : EstadoGarantia.VIGENTE;

  const atrasoConsultora = alertas.some((alerta) => alerta.tipo === TipoAlerta.HITO_ATRASADO_CONSULTORA);
  const atrasoServiuAlto = alertas.some((alerta) => alerta.tipo === TipoAlerta.REVISION_SERVIU_ATRASADA && alerta.diasAtraso > 15);
  const atrasoServiuMedio = alertas.some((alerta) => alerta.tipo === TipoAlerta.REVISION_SERVIU_ATRASADA && alerta.diasAtraso <= 15);

  if (
    atrasoConsultora ||
    atrasoServiuAlto ||
    estadoContrato === EstadoContrato.VENCIDO ||
    estadoGarantia === EstadoGarantia.VENCIDA
  ) {
    return "ALTO";
  }

  if (
    estadoContrato === EstadoContrato.PROXIMO_A_VENCER ||
    estadoGarantia === EstadoGarantia.PROXIMA_A_VENCER ||
    atrasoServiuMedio
  ) {
    return "MEDIO";
  }

  return "BAJO";
}

export function prioridadProyecto(proyecto: ProyectoConControl, today = new Date()): PrioridadProyecto {
  const alertas = generarAlertasCalculadas(proyecto, today);
  const riesgo = nivelRiesgoOperativo(proyecto, today);
  const contratoVencido = alertas.some((a) => a.tipo === TipoAlerta.CONTRATO_VENCIDO);
  const garantiaVencida = alertas.some((a) => a.tipo === TipoAlerta.GARANTIA_VENCIDA);
  const atrasoConsultora = alertas.some((a) => a.tipo === TipoAlerta.HITO_ATRASADO_CONSULTORA);
  const atrasoServiu = alertas.some((a) => a.tipo === TipoAlerta.REVISION_SERVIU_ATRASADA);

  let puntaje = 0;
  if (contratoVencido) puntaje += 40;
  if (garantiaVencida) puntaje += 35;
  if (atrasoConsultora) puntaje += 30;
  if (atrasoServiu) puntaje += 20;
  if (riesgo === "ALTO") puntaje += 20;
  if (riesgo === "MEDIO") puntaje += 10;
  if (proyecto.esCriticoManual) puntaje += 15;
  puntaje += Math.min(20, alertas.reduce((sum, alerta) => sum + Math.max(0, alerta.diasAtraso), 0));

  if (garantiaVencida) {
    return { puntaje, causaPrincipal: "Garantía vencida", severidad: SeveridadAlerta.CRITICA, accionSugerida: "Solicitar prórroga o gestionar cobro de garantía" };
  }
  if (contratoVencido) {
    return { puntaje, causaPrincipal: "Contrato vencido", severidad: SeveridadAlerta.CRITICA, accionSugerida: "Regularizar término contractual o modificación" };
  }
  if (atrasoConsultora) {
    return { puntaje, causaPrincipal: "Atraso de consultora", severidad: SeveridadAlerta.ALTA, accionSugerida: "Escalar atraso de consultora" };
  }
  if (atrasoServiu) {
    return { puntaje, causaPrincipal: "Revisión SERVIU atrasada", severidad: SeveridadAlerta.ALTA, accionSugerida: "Cerrar revisión SERVIU" };
  }
  if (proyecto.esCriticoManual) {
    return { puntaje, causaPrincipal: "Proyecto crítico manual", severidad: SeveridadAlerta.MEDIA, accionSugerida: "Revisar prioridad directiva" };
  }
  if (riesgo === "MEDIO") {
    return { puntaje, causaPrincipal: "Riesgo medio", severidad: SeveridadAlerta.MEDIA, accionSugerida: "Monitorear vencimientos y alertas" };
  }

  return { puntaje, causaPrincipal: "Sin condición crítica", severidad: SeveridadAlerta.BAJA, accionSugerida: "Mantener seguimiento regular" };
}
