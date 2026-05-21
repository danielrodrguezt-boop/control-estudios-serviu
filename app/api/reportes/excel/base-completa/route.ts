import { excelBaseCompleta } from "@/lib/reports/excel";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const buffer = await excelBaseCompleta();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Base completa Control Estudios SERVIU.xlsx"'
    }
  });
}
