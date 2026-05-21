-- CreateTable
CREATE TABLE "TipoEstudio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ProyectoEstudio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigoBip" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoEstudioId" INTEGER NOT NULL,
    "comuna" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'EN_PREPARACION',
    "esCriticoManual" BOOLEAN NOT NULL DEFAULT false,
    "resolucionBases" TEXT,
    "fechaResolucionBases" DATETIME,
    "numeroEstadosPago" INTEGER NOT NULL DEFAULT 0,
    "porcentajeGarantia" REAL NOT NULL DEFAULT 5,
    "plazoGarantiaDias" INTEGER NOT NULL DEFAULT 365,
    "observacionesGenerales" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProyectoEstudio_tipoEstudioId_fkey" FOREIGN KEY ("tipoEstudioId") REFERENCES "TipoEstudio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "nombreConsultora" TEXT NOT NULL,
    "jefeProyecto" TEXT NOT NULL,
    "montoOriginal" INTEGER NOT NULL,
    "montoVigente" INTEGER NOT NULL,
    "plazoConsultorDias" INTEGER NOT NULL,
    "plazoRevisionServiuDias" INTEGER NOT NULL,
    "plazoTotalDias" INTEGER NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaTerminoContractual" DATETIME NOT NULL,
    "fechaTerminoVigente" DATETIME NOT NULL,
    "estadoContrato" TEXT NOT NULL DEFAULT 'VIGENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contrato_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "esFinal" BOOLEAN NOT NULL DEFAULT false,
    "porcentajePago" REAL NOT NULL,
    "montoProgramado" INTEGER NOT NULL DEFAULT 0,
    "fechaEntregaProgramada" DATETIME NOT NULL,
    "fechaEntregaReal" DATETIME,
    "fechaObservaciones" DATETIME,
    "fechaCorrecciones" DATETIME,
    "fechaAprobacion" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "multaAplica" BOOLEAN NOT NULL DEFAULT false,
    "montoMulta" INTEGER NOT NULL DEFAULT 0,
    "montoCobrado" INTEGER NOT NULL DEFAULT 0,
    "montoPagado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hito_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Garantia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Fiel cumplimiento',
    "folio" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "fechaEmision" DATETIME NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'VIGENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Garantia_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModificacionContractual" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "resolucion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "variacionMonto" INTEGER NOT NULL DEFAULT 0,
    "variacionPlazoConsultorDias" INTEGER NOT NULL DEFAULT 0,
    "variacionPlazoRevisionServiuDias" INTEGER NOT NULL DEFAULT 0,
    "nuevoMontoVigente" INTEGER NOT NULL,
    "nuevaFechaTerminoVigente" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModificacionContractual_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proyectoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fechaDeteccion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alerta_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "ProyectoEstudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoEstudio_nombre_key" ON "TipoEstudio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ProyectoEstudio_codigoBip_key" ON "ProyectoEstudio"("codigoBip");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_proyectoId_key" ON "Contrato"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "Garantia_proyectoId_key" ON "Garantia"("proyectoId");
