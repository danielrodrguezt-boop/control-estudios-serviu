import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="max-w-md rounded-lg border border-border bg-white p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h2 className="mt-2 text-2xl font-bold">Pagina no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">La ruta solicitada no existe o ya no esta disponible.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Ir al inicio</Link>
          <Link href="/login" className="rounded-md border border-border px-3 py-2 text-sm font-medium">Iniciar sesion</Link>
        </div>
      </div>
    </div>
  );
}
