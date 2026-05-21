import { wordGarantias } from "@/lib/reports/word";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser();
  const buffer = await wordGarantias();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="garantias-proximas-vencer.docx"'
    }
  });
}
