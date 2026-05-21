import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string; reason?: string } }) {
  const error = searchParams?.error === "credenciales";
  const sessionExpired = searchParams?.reason === "session";

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Control Estudios SERVIU</p>
          <CardTitle>Iniciar sesion</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" method="post" className="grid gap-4">
            {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">Email o contrasena incorrectos.</p>}
            {sessionExpired && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">La sesion expiro o debes iniciar sesion para continuar.</p>}
            <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
            <Field label="Contrasena"><Input name="password" type="password" required autoComplete="current-password" /></Field>
            <Button>Ingresar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
