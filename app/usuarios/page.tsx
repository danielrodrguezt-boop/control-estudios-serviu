import { alternarUsuarioAction, cambiarPasswordUsuarioAction, crearUsuarioAction } from "@/app/auth-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";

export default async function UsuariosPage() {
  await requireAdmin();
  const usuarios = await prisma.usuario.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Solo administradores</p>
        <h2 className="text-2xl font-bold">Administracion de usuarios</h2>
      </header>

      <Card>
        <CardHeader><CardTitle>Crear usuario</CardTitle></CardHeader>
        <CardContent>
          <form action={crearUsuarioAction} className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre"><Input name="nombre" required /></Field>
            <Field label="Email"><Input name="email" type="email" required /></Field>
            <Field label="Rol">
              <Select name="rol" defaultValue="USUARIO">
                <option value="USUARIO">USUARIO</option>
                <option value="ADMIN">ADMIN</option>
              </Select>
            </Field>
            <Field label="Contrasena inicial"><Input name="password" type="password" required /></Field>
            <div className="md:col-span-2"><SubmitButton>Crear usuario</SubmitButton></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border bg-muted text-left">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Resetear contrasena</th>
                <th className="px-4 py-3">Accion</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{usuario.nombre}</td>
                  <td className="px-4 py-3">{usuario.email}</td>
                  <td className="px-4 py-3"><Badge>{usuario.rol}</Badge></td>
                  <td className="px-4 py-3">{usuario.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="muted">Inactivo</Badge>}</td>
                  <td className="px-4 py-3">
                    <form action={cambiarPasswordUsuarioAction.bind(null, usuario.id)} className="flex gap-2">
                      <input name="password" type="password" placeholder="Nueva contrasena" className="h-8 rounded-md border border-input px-2 text-xs" required />
                      <button className="h-8 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted">Cambiar</button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={alternarUsuarioAction.bind(null, usuario.id, !usuario.activo)}>
                      <button className="h-8 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted">{usuario.activo ? "Desactivar" : "Activar"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
