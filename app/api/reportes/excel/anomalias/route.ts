import { excelAnomalias } from "@/lib/reports/excel";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser();
  const buffer = await excelAnomalias();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Anomalias Control Estudios SERVIU.xlsx"'
    }
  });
}
