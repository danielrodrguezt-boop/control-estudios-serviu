import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
