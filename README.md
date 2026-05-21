# Control Estudios SERVIU

MVP local para controlar estudios de diseño contratados por SERVIU Región del Biobío. Incluye cartera, ficha CRM por proyecto, contrato, hitos/estados de pago, finanzas, garantía de fiel cumplimiento, modificaciones contractuales, alertas y reportes Word/Excel.

## Stack

- Next.js App Router
- React + TypeScript
- Prisma ORM
- SQLite
- Tailwind CSS
- shadcn/ui en componentes locales
- Recharts
- exceljs
- docx
- bcryptjs

## Instalación

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Luego abrir `http://localhost:3000`.

## Localhost y despliegue web

`localhost` significa "este mismo computador". Si la app corre en `http://localhost:3000`, otro PC no puede entrar usando ese enlace porque su propio `localhost` apunta a su equipo, no al servidor donde corre la app.

Para compartir el sistema mediante enlace hay que desplegarlo en una URL real, por ejemplo Vercel con PostgreSQL externo, un servidor Node.js institucional o una plataforma compatible con Next.js. En despliegue se debe usar HTTPS, una base PostgreSQL persistente y variables de entorno seguras.

## Variables de entorno

Copiar `.env.example` a `.env` en desarrollo local. El archivo `.env` no debe versionarse.

Desarrollo SQLite:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="un-secreto-local"
```

Produccion PostgreSQL:

```bash
DATABASE_URL="postgresql://usuario:password@host:5432/control_estudios_serviu?schema=public"
AUTH_SECRET="secreto-largo-aleatorio"
```

## PostgreSQL para produccion

SQLite se mantiene como opcion simple para desarrollo local. Para produccion se dejo un schema separado en `prisma-postgres/schema.prisma` y migracion inicial en `prisma-postgres/migrations`.

```bash
npm install
npm run prisma:generate:postgres
npm run prisma:migrate:postgres
npm run build
npm run start
```

No ejecutar seed demo automaticamente en produccion. Crear usuarios reales desde `/usuarios` o mediante un script controlado.

## Autenticacion

El sistema exige login para dashboard, proyectos, alertas, reportes y APIs internas. La sesion usa cookie HTTP-only firmada con `AUTH_SECRET`.

Roles:

- `ADMIN`: administra usuarios y puede eliminar registros criticos.
- `USUARIO`: puede ver y editar proyectos, contratos, hitos, garantias, modificaciones y alertas.

Usuario admin de desarrollo:

```text
email: admin@serviu.local
password: Admin1234!
```

Esta contrasena debe cambiarse antes de cualquier uso real.

## Despliegue

1. Crear una base PostgreSQL persistente.
2. Configurar `DATABASE_URL` con URL PostgreSQL.
3. Configurar `AUTH_SECRET` fuerte.
4. Ejecutar `npm install`.
5. Ejecutar `npm run prisma:generate:postgres`.
6. Ejecutar `npm run prisma:migrate:postgres`.
7. Ejecutar `npm run build`.
8. Iniciar con `npm run start` o configurar la plataforma Next.js.
9. Crear/cambiar el usuario administrador.

## Migracion desde SQLite

Antes de migrar, respaldar `prisma/dev.db`.

Estrategia recomendada para este sprint:

1. Exportar `Base completa Control Estudios SERVIU` desde la app local.
2. Desplegar produccion con PostgreSQL limpio.
3. Recargar manualmente datos criticos o preparar un importador especifico en un sprint futuro.

Una migracion automatica SQLite a PostgreSQL puede requerir script dedicado para respetar relaciones, IDs, fechas y hashes de usuarios.

## Datos demo

El seed crea tipos de estudio, tres proyectos, contratos, hitos, garantías y modificaciones. Incluye casos con proyecto crítico manual, garantía próxima a vencer, garantía vencida, atraso de consultora, revisión SERVIU pendiente y suma de hitos distinta de 100%.

## Reglas de negocio implementadas

- Cada hito representa un entregable y un estado de pago.
- No existe entidad independiente de estado de pago.
- El monto programado se recalcula desde el porcentaje del hito sobre el monto vigente del contrato.
- Atraso de consultora: fecha programada vencida sin entrega real.
- Atraso SERVIU: entrega real sin aprobación superando el plazo de revisión del contrato.
- Garantía próxima a vencer: 60 días o menos.
- Contrato próximo a vencer: 60 días o menos.
- Proyecto crítico: marca manual.
- Modificaciones contractuales actualizan automáticamente monto vigente, plazos y fecha término vigente.

## Reportes

- `/api/reportes/word/proyecto/[id]`
- `/api/reportes/word/cartera-critica`
- `/api/reportes/word/garantias`
- `/api/reportes/excel/cartera`
- `/api/reportes/excel/hitos`
- `/api/reportes/excel/alertas`
- `/api/reportes/excel/anomalias`
- `/api/reportes/excel/comparativo`
- `/api/reportes/excel/consultoras`
- `/api/reportes/excel/tipos`
- `/api/reportes/word/comparativo`
- `/api/reportes/word/anomalias`

## Alcances excluidos

No incluye autenticación, adjuntos, carga de archivos ni integración con SIGFE, Mercado Público, SharePoint o Power BI real.

## Checklist de validación manual

1. Crear un proyecto desde `Proyectos y estudios` con código BIP, nombre, tipo, comuna y estado.
2. Crear contrato con monto original, monto vigente, plazos y fecha de inicio.
3. Crear hitos con porcentajes de pago y montos pagados.
4. Confirmar advertencia cuando la suma de porcentajes de hitos sea distinta de 100%.
5. Registrar fecha de entrega real de un hito.
6. Forzar atraso consultora dejando un hito sin entrega real y con fecha programada vencida.
7. Forzar atraso SERVIU registrando entrega real, sin aprobación, y superando el plazo de revisión.
8. Registrar garantía con folio, monto y fecha de emisión.
9. Verificar que el vencimiento de garantía se calcule como fecha término contrato vigente más plazo de garantía.
10. Registrar modificación contractual de plazo.
11. Confirmar que la garantía recalcula su vencimiento automáticamente.
12. Exportar Excel de cartera, base completa y dashboard ejecutivo.
13. Exportar Word de proyecto, cartera crítica y garantías.
14. Revisar el mapa de calor por tipo de estudio y nivel de riesgo en el dashboard.
15. Ejecutar `npm run build`.

## Checklist Sprint 6

1. Usar `Buscar` para encontrar proyectos por codigo BIP, consultora, comuna, tipo o folio de garantia.
2. Abrir `Proyectos` y probar filtros avanzados por riesgo, comuna, consultora, vencimientos, alertas y atrasos.
3. Entrar a una ficha y revisar la pestana `Historial`.
4. Ir a `Alertas`, marcar una alerta como resuelta con comentario y confirmar que aparece en el filtro `Resueltas`.
5. Revisar `Gestion diaria` y verificar tareas urgentes, garantias, contratos, atrasos y anomalias.
6. Revisar `Anomalias` y descargar Excel/Word.
7. Usar `Comparar`, seleccionar proyectos y descargar Excel/Word comparativo.
8. Revisar dashboards `Consultoras` y `Tipos estudio` y sus exportaciones Excel.

## Checklist antes de uso real

1. Cambiar la contrasena del admin inicial.
2. Configurar `AUTH_SECRET` fuerte y privado.
3. Usar HTTPS.
4. Restringir usuarios y roles.
5. Respaldar la base PostgreSQL.
6. No exponer la app publicamente sin control institucional.
7. Verificar exportacion de respaldo Excel.
8. Revisar que `.env` no este versionado.
9. No ejecutar seed demo sobre datos reales.
10. Probar login, logout, usuarios y reportes en la URL desplegada.
