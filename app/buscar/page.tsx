import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BuscarPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = (searchParams?.q ?? "").trim();
  const proyectos = q
    ? await prisma.proyectoEstudio.findMany({
        where: {
          OR: [
            { codigoBip: { contains: q } },
            { nombre: { contains: q } },
            { comuna: { contains: q } },
            { tipoEstudio: { nombre: { contains: q } } },
            { contrato: { nombreConsultora: { contains: q } } },
            { contrato: { jefeProyecto: { contains: q } } },
            { garantia: { folio: { contains: q } } }
          ]
        },
        include: { tipoEstudio: true, contrato: true, garantia: true },
        orderBy: { updatedAt: "desc" }
      })
    : [];

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Acceso rapido a la cartera</p>
        <h2 className="text-2xl font-bold">Busqueda global</h2>
      </header>
      <Card>
        <CardContent>
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Codigo BIP, proyecto, consultora, comuna, folio..." className="h-10 flex-1 rounded-md border border-input px-3 text-sm" />
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Buscar</button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {q && proyectos.length === 0 && <p className="p-4 text-sm text-muted-foreground">No se encontraron proyectos para la busqueda.</p>}
          {!q && <p className="p-4 text-sm text-muted-foreground">Escribe al menos un termino para buscar en toda la cartera.</p>}
          {proyectos.map((p) => (
            <Link key={p.id} href={`/proyectos/${p.id}`} className="grid gap-1 border-b border-border p-4 hover:bg-muted">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-primary">{p.codigoBip}</span>
                <span className="font-medium">{p.nombre}</span>
                {p.esCriticoManual && <Badge tone="danger">Critico</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {p.tipoEstudio.nombre} Ã‚Â· {p.comuna} Ã‚Â· {p.contrato?.nombreConsultora ?? "Sin consultora"} Ã‚Â· Folio {p.garantia?.folio ?? "-"}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
