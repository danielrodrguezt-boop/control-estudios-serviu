import { excelCartera } from "@/lib/reports/excel";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const buffer = await excelCartera();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="cartera-total.xlsx"'
    }
  });
}
