import { excelAlertas } from "@/lib/reports/excel";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser();
  const buffer = await excelAlertas();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="alertas.xlsx"'
    }
  });
}
