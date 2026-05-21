import { wordAnomaliasCriticas } from "@/lib/reports/word";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const buffer = await wordAnomaliasCriticas();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Anomalias criticas Control Estudios SERVIU.docx"'
    }
  });
}
