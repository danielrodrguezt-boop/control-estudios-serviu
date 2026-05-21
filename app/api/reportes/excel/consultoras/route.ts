import { excelDesempenoConsultoras } from "@/lib/reports/excel";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const buffer = await excelDesempenoConsultoras();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Desempeno consultoras Control Estudios SERVIU.xlsx"'
    }
  });
}
