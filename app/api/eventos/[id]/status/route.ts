import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";

// Encerrar preserva todos os dados e bloqueia novas alterações; reabrir é reversível.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const status = body.closed ? "closed" : "active";
  const { error } = await context.database
    .from("events")
    .update({ status, closed_at:status === "closed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", context.user.id);

  if(error)return NextResponse.json({ message: "Não foi possível alterar o evento." }, { status: 500 });
  await writeAudit(context.database,id,context.user.id,status==="closed"?"event_closed":"event_reopened");
  return NextResponse.json({ message: status === "closed" ? "Evento encerrado." : "Evento reaberto." });
}
