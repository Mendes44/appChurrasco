import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";

// Atualiza o pagamento somente depois de confirmar que o convidado pertence ao organizador.
export async function PATCH(request: Request, { params }: { params: Promise<{ id:string }> }) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ message:"Não autorizado." }, { status:403 });
  const { id } = await params;
  const body = await request.json();
  if (typeof body.paid !== "boolean") return NextResponse.json({ message:"Status inválido." }, { status:400 });
  const { data:guest } = await context.database.from("guests").select("id,event_id").eq("id",id).maybeSingle();
  if (!guest) return NextResponse.json({ message:"Convidado não encontrado." }, { status:404 });
  const { data:event } = await context.database.from("events").select("id,status").eq("id",guest.event_id).eq("owner_id",context.user.id).maybeSingle();
  if (!event) return NextResponse.json({ message:"Não autorizado." }, { status:403 });
  if (event.status === "closed") return NextResponse.json({ message:"Este evento está encerrado." }, { status:409 });
  const { error } = await context.database.from("guests").update({ paid_at:body.paid?new Date().toISOString():null }).eq("id",id);
  if (error) return NextResponse.json({ message:`Não foi possível atualizar (${error.code}).` }, { status:500 });
  await writeAudit(context.database,guest.event_id,context.user.id,body.paid?"payment_confirmed":"payment_reopened",{guest_id:id});
  return NextResponse.json({ message:body.paid?"Pagamento confirmado.":"Pagamento marcado como pendente." });
}
