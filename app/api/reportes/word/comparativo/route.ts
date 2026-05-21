import { wordComparativo } from "@/lib/reports/word";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  await requireUser();
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").map((id) => Number(id)).filter(Boolean);
  const buffer = await wordComparativo(ids);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Informe comparativo Control Estudios SERVIU.docx"'
    }
  });
}
