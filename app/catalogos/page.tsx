import { alternarTipoEstudio, crearTipoEstudio } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

export default async function CatalogosPage() {
  const tipos = await prisma.tipoEstudio.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Catálogos configurables del MVP</p>
        <h2 className="text-2xl font-bold">Tipos de estudio</h2>
      </header>

      <Card>
        <CardHeader><CardTitle>Nuevo tipo de estudio</CardTitle></CardHeader>
        <CardContent>
          <form action={crearTipoEstudio} className="flex max-w-xl gap-3">
            <Field label="Nombre"><Input name="nombre" required /></Field>
            <div className="pt-6"><Button>Agregar</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Listado</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {tipos.map((tipo) => (
            <div key={tipo.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <strong>{tipo.nombre}</strong>
                <Badge tone={tipo.activo ? "success" : "muted"}>{tipo.activo ? "Activo" : "Inactivo"}</Badge>
              </div>
              <form action={alternarTipoEstudio.bind(null, tipo.id, !tipo.activo)}>
                <Button variant="outline">{tipo.activo ? "Desactivar" : "Activar"}</Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
