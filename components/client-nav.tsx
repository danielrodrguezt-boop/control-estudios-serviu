"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/nav";

type UsuarioSesion = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
};

export function ClientNav() {
  const [user, setUser] = useState<UsuarioSesion | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active) setUser(data?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;
  return <Nav user={user} />;
}
