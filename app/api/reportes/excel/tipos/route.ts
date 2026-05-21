import { excelAnalisisTipoEstudio } from "@/lib/reports/excel";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const buffer = await excelAnalisisTipoEstudio();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Analisis tipo estudio Control Estudios SERVIU.xlsx"'
    }
  });
}
