import Link from "next/link";
import { AlertTriangle, BarChart3, FolderKanban, GitCompare, LayoutList, Search, Settings, Users } from "lucide-react";

type UsuarioSesion = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
};

const items = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/diario", label: "Gestion diaria", icon: LayoutList },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/comparar", label: "Comparar", icon: GitCompare },
  { href: "/alertas", label: "Alertas", icon: AlertTriangle },
  { href: "/anomalias", label: "Anomalias", icon: AlertTriangle },
  { href: "/consultoras", label: "Consultoras", icon: Users },
  { href: "/tipos", label: "Tipos estudio", icon: BarChart3 },
  { href: "/catalogos", label: "Catalogos", icon: Settings }
];

export function Nav({ user }: { user: UsuarioSesion }) {
  const visibleItems = user.rol === "ADMIN" ? [...items, { href: "/usuarios", label: "Usuarios", icon: Users }] : items;

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-white px-4 py-5 lg:block">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SERVIU Biobio</p>
        <h1 className="mt-1 text-lg font-bold">Control Estudios</h1>
      </div>
      <nav className="grid gap-1">
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-5 left-4 right-4 rounded-md border border-border p-3 text-sm">
        <p className="font-medium">{user.nombre}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">Rol {user.rol}</p>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button className="h-8 w-full rounded-md border border-border text-xs font-medium hover:bg-muted">Cerrar sesion</button>
        </form>
      </div>
    </aside>
  );
}
