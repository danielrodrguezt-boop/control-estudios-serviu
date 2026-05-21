import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function hasRequiredAuthSecret() {
  return Boolean(process.env.AUTH_SECRET || process.env.SESSION_SECRET || process.env.NODE_ENV !== "production");
}

export async function POST(request: Request) {
  try {
    if (!hasRequiredAuthSecret()) {
      return NextResponse.json({ ok: false, error: "AUTH_SECRET requerido" }, { status: 500 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "");
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user?.activo || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, error: "Credenciales invalidas" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
    response.cookies.set(SESSION_COOKIE, createSessionToken({ id: user.id, email: user.email, rol: user.rol }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/"
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Error interno al iniciar sesion" }, { status: 500 });
  }
}
