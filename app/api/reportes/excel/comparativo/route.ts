import { excelComparativoProyectos } from "@/lib/reports/excel";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  await requireUser();
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").map((id) => Number(id)).filter(Boolean);
  const buffer = await excelComparativoProyectos(ids);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Comparativo proyectos Control Estudios SERVIU.xlsx"'
    }
  });
}
