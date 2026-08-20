import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminContext(); if (!context) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const { id } = await params; const body = await request.json(); const party = Math.min(2, Math.max(0, Number(body.partySize))); const drinkers = Math.min(party, Math.max(0, Number(body.drinkersCount)));
  const name = String(body.name ?? "").trim(); if (name.length < 2 || name.length > 80) return NextResponse.json({ message:"Informe um nome válido." }, { status:400 });
  const companion = party === 2 ? String(body.companionName ?? "").trim() : null;
  if (party === 2 && (!companion || companion.length < 2)) return NextResponse.json({ message:"Informe o nome do acompanhante." }, { status:400 });
  const { data: guest } = await context.database.from("guests").select("id,event_id").eq("id", id).maybeSingle();
  if (!guest) return NextResponse.json({ message:"Convidado não encontrado." }, { status:404 });
  const { data: ownedEvent } = await context.database.from("events").select("id").eq("id", guest.event_id).eq("owner_id", context.user.id).maybeSingle();
  if (!ownedEvent) return NextResponse.json({ message:"Não autorizado." }, { status:403 });
  const { error } = await context.database.from("guests").update({ name, companion_name: companion, is_attending: party > 0, party_size: party, drinkers_count: drinkers, drinks: drinkers > 0, brings_own_drink: Boolean(body.bringsOwnDrink) }).eq("id", id);
  if (error) { console.error("guest_update_failed", error.code); return NextResponse.json({ message:`Não foi possível editar (${error.code}).` }, { status:500 }); }
  return NextResponse.json({ message:"Resposta atualizada." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminContext(); if (!context) return NextResponse.json({ message:"Não autorizado." }, { status:403 });
  const { id } = await params;
  const { data: guest } = await context.database.from("guests").select("id,event_id").eq("id", id).maybeSingle();
  if (!guest) return NextResponse.json({ message:"Convidado não encontrado." }, { status:404 });
  const { data: ownedEvent } = await context.database.from("events").select("id").eq("id", guest.event_id).eq("owner_id", context.user.id).maybeSingle();
  if (!ownedEvent) return NextResponse.json({ message:"Não autorizado." }, { status:403 });
  const { error } = await context.database.from("guests").delete().eq("id", id);
  return error ? NextResponse.json({ message:`Não foi possível excluir (${error.code}).` }, { status:500 }) : NextResponse.json({ message:"Convidado excluído." });
}
