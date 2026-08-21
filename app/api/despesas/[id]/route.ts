import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";

// Exclui banco e arquivo apenas depois de confirmar a propriedade do evento.
export async function DELETE(_request: Request, { params }: { params: Promise<{id:string}> }) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ message:"Não autorizado." }, { status:403 });
  const { id } = await params;
  const { data: expense } = await context.database.from("expenses").select("id,event_id,receipt_path").eq("id", id).maybeSingle();
  if (!expense) return NextResponse.json({ message:"Despesa não encontrada." }, { status:404 });
  const { data: event } = await context.database.from("events").select("id").eq("id", expense.event_id).eq("owner_id", context.user.id).maybeSingle();
  if (!event) return NextResponse.json({ message:"Não autorizado." }, { status:403 });
  const { error } = await context.database.from("expenses").delete().eq("id", id);
  if (error) return NextResponse.json({ message:"Não foi possível excluir." }, { status:500 });
  if (expense.receipt_path) await context.database.storage.from("receipts").remove([expense.receipt_path]);
  return NextResponse.json({ message:"Despesa excluída." });
}
