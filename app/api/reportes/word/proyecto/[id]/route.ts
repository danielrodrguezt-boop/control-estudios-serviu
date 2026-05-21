import { wordProyecto } from "@/lib/reports/word";
import { requireUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  await requireUser();
  const { id } = params;
  const buffer = await wordProyecto(Number(id));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="reporte-proyecto-${id}.docx"`
    }
  });
}
