import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // O filtro simultâneo por id e owner_id impede editar eventos de terceiros.
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const { id } = await params;
  const { data: currentEvent } = await context.database.from("events").select("status").eq("id", id).eq("owner_id", context.user.id).maybeSingle();
  if (!currentEvent) return NextResponse.json({ message:"Evento não encontrado." }, { status:404 });
  if (currentEvent.status === "closed") return NextResponse.json({ message:"Reabra o evento antes de editá-lo." }, { status:409 });
  const body = await request.json();
  const values = {
    title: String(body.title ?? "").trim(),
    address: String(body.address ?? "").trim() || null,
    event_date: body.eventDate,
    grams_per_person: Number(body.gramsPerPerson),
    beer_liters_per_drinker: Number(body.beerLitersPerDrinker ?? 1.5),
    pix_key: String(body.pixKey ?? "").trim() || null,
    pix_holder: String(body.pixHolder ?? "").trim() || null,
    rsvp_deadline: body.rsvpDeadline || null,
  };
  if (
    values.title.length < 3 ||
    (values.pix_key?.length ?? 0) > 120 ||
    (values.pix_holder?.length ?? 0) > 120 ||
    !values.event_date ||
    values.grams_per_person < 200 ||
    values.grams_per_person > 1000 ||
    values.beer_liters_per_drinker < 0.1 ||
    values.beer_liters_per_drinker > 5
  )
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  const { error } = await context.database
    .from("events")
    .update(values)
    .eq("id", id)
    .eq("owner_id", context.user.id);
  return error
    ? NextResponse.json(
        { message: `Não foi possível salvar (${error.code}).` },
        { status: 500 },
      )
    : NextResponse.json({ message: "Alterações salvas." });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // O relacionamento ON DELETE CASCADE remove dependências do evento no banco.
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const { id } = await params;
  const { data: event } = await context.database.from("events").select("status").eq("id", id).eq("owner_id", context.user.id).maybeSingle();
  if (!event) return NextResponse.json({ message:"Evento não encontrado." }, { status:404 });
  if (event.status === "closed") return NextResponse.json({ message:"Reabra o evento antes de excluí-lo." }, { status:409 });
  const { error } = await context.database
    .from("events")
    .delete()
    .eq("id", id)
    .eq("owner_id", context.user.id);
  return error
    ? NextResponse.json(
        { message: "Não foi possível excluir." },
        { status: 500 },
      )
    : NextResponse.json({ message: "Churrasco excluído." });
}
