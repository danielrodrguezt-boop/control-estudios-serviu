import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.usuario.findUnique({ where: { email } });

  if (!user?.activo || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=credenciales");
  }

  setSessionCookie({ id: user.id, email: user.email, rol: user.rol });
  redirect("/");
}
