import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type UsuarioSesion = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
};

type SessionPayload = {
  userId: number;
  email: string;
  rol: string;
  exp: number;
};

function secret() {
  return process.env.AUTH_SECRET || process.env.SESSION_SECRET || "dev-secret-change-before-production";
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(user: Pick<UsuarioSesion, "id" | "email" | "rol">) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    rol: user.rol,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(user: Pick<UsuarioSesion, "id" | "email" | "rol">) {
  cookies().set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<UsuarioSesion | null> {
  const payload = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: { id: true, nombre: true, email: true, rol: true, activo: true }
  });
  if (!user?.activo) return null;
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login?reason=session");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== "ADMIN") redirect("/");
  return user;
}
