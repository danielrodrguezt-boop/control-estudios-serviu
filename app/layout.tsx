import type { Metadata } from "next";
import type React from "react";
import "./globals.css";
import { Nav } from "@/components/nav";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Control Estudios SERVIU",
  description: "MVP de control de estudios de diseño SERVIU Región del Biobío"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="es">
      <body>
        {user && <Nav user={user} />}
        <main className={`min-h-screen bg-slate-50 ${user ? "lg:pl-64" : ""}`}>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
