export const estadoProyectoLabel: Record<string, string> = {
  EN_PREPARACION: "En preparación",
  LICITADO: "Licitado",
  ADJUDICADO: "Adjudicado",
  EN_EJECUCION: "En ejecución",
  CON_OBSERVACIONES: "Con observaciones",
  SUSPENDIDO: "Suspendido",
  MODIFICADO: "Modificado",
  FINALIZADO: "Finalizado",
  RECEPCIONADO: "Recepcionado",
  TERMINADO_ANTICIPADAMENTE: "Terminado anticipadamente",
  COBRO_DE_GARANTIA: "Cobro de garantía",
  CERRADO: "Cerrado"
};

export const estadoHitoLabel: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENTREGADO: "Entregado",
  EN_REVISION_SERVIU: "En revisión SERVIU",
  CON_OBSERVACIONES: "Con observaciones",
  CORREGIDO: "Corregido",
  APROBADO: "Aprobado",
  ATRASADO_CONSULTORA: "Atrasado consultora",
  ATRASADO_SERVIU: "Atrasado SERVIU"
};

export const estadoGarantiaLabel: Record<string, string> = {
  VIGENTE: "Vigente",
  PROXIMA_A_VENCER: "Próxima a vencer",
  VENCIDA: "Vencida",
  PRORROGADA: "Prorrogada",
  COBRO_SOLICITADO: "Cobro solicitado",
  COBRADA: "Cobrada"
};

export const estadoContratoLabel: Record<string, string> = {
  VIGENTE: "Vigente",
  PROXIMO_A_VENCER: "Próximo a vencer",
  VENCIDO: "Vencido",
  SUSPENDIDO: "Suspendido",
  TERMINADO: "Terminado"
};

export const tipoModificacionLabel: Record<string, string> = {
  AUMENTO_MONTO: "Aumento de monto",
  DISMINUCION_MONTO: "Disminución de monto",
  AMPLIACION_PLAZO: "Ampliación de plazo",
  SUSPENSION: "Suspensión",
  REANUDACION: "Reanudación",
  TERMINO_ANTICIPADO: "Término anticipado",
  MODIFICACION_MIXTA: "Modificación mixta"
};

export const tipoAlertaLabel: Record<string, string> = {
  HITO_ATRASADO_CONSULTORA: "Hito atrasado por consultora",
  REVISION_SERVIU_ATRASADA: "Revisión SERVIU atrasada",
  GARANTIA_PROXIMA_A_VENCER: "Garantía próxima a vencer",
  GARANTIA_VENCIDA: "Garantía vencida",
  CONTRATO_PROXIMO_A_VENCER: "Contrato próximo a vencer",
  CONTRATO_VENCIDO: "Contrato vencido",
  HITOS_NO_SUMAN_100: "Suma de hitos distinta de 100%"
};

export const severidadLabel: Record<string, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica"
};
