"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, requireAdmin, setSessionCookie } from "@/lib/auth";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const user = await prisma.usuario.findUnique({ where: { email } });

  if (!user?.activo || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=credenciales");
  }

  setSessionCookie({ id: user.id, email: user.email, rol: user.rol });
  redirect("/");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/login");
}

export async function crearUsuarioAction(formData: FormData) {
  await requireAdmin();
  const nombre = text(formData, "nombre");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const rol = text(formData, "rol") || "USUARIO";
  if (!nombre || !email || !password) throw new Error("Nombre, email y contrasena son obligatorios.");
  await prisma.usuario.create({
    data: {
      nombre,
      email,
      rol,
      activo: true,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });
  revalidatePath("/usuarios");
}

export async function cambiarPasswordUsuarioAction(usuarioId: number, formData: FormData) {
  await requireAdmin();
  const password = text(formData, "password");
  if (!password) throw new Error("La nueva contrasena es obligatoria.");
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { passwordHash: await bcrypt.hash(password, 12) }
  });
  revalidatePath("/usuarios");
}

export async function alternarUsuarioAction(usuarioId: number, activo: boolean) {
  await requireAdmin();
  await prisma.usuario.update({ where: { id: usuarioId }, data: { activo } });
  revalidatePath("/usuarios");
}
