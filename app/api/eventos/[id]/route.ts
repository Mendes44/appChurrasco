import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // O filtro simultâneo por id e owner_id impede editar eventos de terceiros.
  const context = await getAdminContext(); if (!context) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const { id } = await params; const body = await request.json();
  const values = { title: String(body.title ?? "").trim(), address: String(body.address ?? "").trim() || null, event_date: body.eventDate, grams_per_person: Number(body.gramsPerPerson) };
  if (values.title.length < 3 || !values.event_date || values.grams_per_person < 200 || values.grams_per_person > 1000) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  const { error } = await context.database.from("events").update(values).eq("id", id).eq("owner_id", context.user.id);
  return error ? NextResponse.json({ message: `Não foi possível salvar (${error.code}).` }, { status: 500 }) : NextResponse.json({ message: "Alterações salvas." });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  // O relacionamento ON DELETE CASCADE remove dependências do evento no banco.
  const context = await getAdminContext(); if (!context) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const { id } = await params; const { error } = await context.database.from("events").delete().eq("id", id).eq("owner_id", context.user.id);
  return error ? NextResponse.json({ message: "Não foi possível excluir." }, { status: 500 }) : NextResponse.json({ message: "Churrasco excluído." });
}
