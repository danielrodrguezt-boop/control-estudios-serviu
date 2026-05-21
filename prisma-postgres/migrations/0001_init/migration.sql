CREATE TABLE "TipoEstudio" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "activo" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "ProyectoEstudio" (
  "id" SERIAL PRIMARY KEY,
  "codigoBip" TEXT NOT NULL UNIQUE,
  "nombre" TEXT NOT NULL,
  "tipoEstudioId" INTEGER NOT NULL,
  "comuna" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'EN_PREPARACION',
  "esCriticoManual" BOOLEAN NOT NULL DEFAULT false,
  "resolucionBases" TEXT,
  "fechaResolucionBases" TIMESTAMP(3),
  "numeroEstadosPago" INTEGER NOT NULL DEFAULT 0,
  "porcentajeGarantia" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "plazoGarantiaDias" INTEGER NOT NULL DEFAULT 365,
  "observacionesGenerales" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProyectoEstudio_tipoEstudioId_fkey" FOREIGN KEY ("tipoEstudioId") REFERENCES "TipoEstudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Contrato" (
  "id" SERIAL PRIMARY KEY,
  "proyectoId" INTEGER NOT NULL UNIQUE,
  "nombreConsultora" TEXT NOT NULL,
  "jefeProyecto" TEXT NOT NULL,
  "montoOriginal" INTEGER NOT NULL,
  "montoVigente" INTEGER NOT NULL,
  "plazoConsultorDias" INTEGER NOT NULL,
  "plazoRevisionServiuDias" INTEGER NOT NULL,
  "plazoTotalDias" INTEGER NOT NULL,
  "fechaInicio" TIMESTAMP(3) NOT NULL,
  "fechaTerminoContractual" TIMESTAMP(3) NOT NULL,
  "fechaTerminoVigente" TIMESTAMP(3) NOT NULL,
  "estadoContrato" TEXT NOT NULL DEFAULT 'VIGENTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contrato_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Hito" (
  "id" SERIAL PRIMARY KEY,
  "proyectoId" INTEGER NOT NULL,
  "numero" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "esFinal" BOOLEAN NOT NULL DEFAULT false,
  "porcentajePago" DOUBLE PRECISION NOT NULL,
  "montoProgramado" INTEGER NOT NULL DEFAULT 0,
  "fechaEntregaProgramada" TIMESTAMP(3) NOT NULL,
  "fechaEntregaReal" TIMESTAMP(3),
  "fechaObservaciones" TIMESTAMP(3),
  "fechaCorrecciones" TIMESTAMP(3),
  "fechaAprobacion" TIMESTAMP(3),
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "multaAplica" BOOLEAN NOT NULL DEFAULT false,
  "montoMulta" INTEGER NOT NULL DEFAULT 0,
  "montoCobrado" INTEGER NOT NULL DEFAULT 0,
  "montoPagado" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Hito_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Garantia" (
  "id" SERIAL PRIMARY KEY,
  "proyectoId" INTEGER NOT NULL UNIQUE,
  "tipo" TEXT NOT NULL DEFAULT 'Fiel cumplimiento',
  "folio" TEXT NOT NULL,
  "monto" INTEGER NOT NULL,
  "fechaEmision" TIMESTAMP(3) NOT NULL,
  "fechaVencimiento" TIMESTAMP(3) NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'VIGENTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Garantia_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ModificacionContractual" (
  "id" SERIAL PRIMARY KEY,
  "proyectoId" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "resolucion" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "variacionMonto" INTEGER NOT NULL DEFAULT 0,
  "variacionPlazoConsultorDias" INTEGER NOT NULL DEFAULT 0,
  "variacionPlazoRevisionServiuDias" INTEGER NOT NULL DEFAULT 0,
  "nuevoMontoVigente" INTEGER NOT NULL,
  "nuevaFechaTerminoVigente" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModificacionContractual_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Alerta" (
  "id" SERIAL PRIMARY KEY,
  "proyectoId" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "severidad" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "fechaDeteccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resuelta" BOOLEAN NOT NULL DEFAULT false,
  "fechaResolucion" TIMESTAMP(3),
  "comentarioResolucion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alerta_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Usuario" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "rol" TEXT NOT NULL DEFAULT 'USUARIO',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
