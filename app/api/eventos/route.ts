import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Toda mutação administrativa começa confirmando sessão e e-mail permitido.
  const context = await getAdminContext(); if (!context) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const body = await request.json(); const title = String(body.title ?? "").trim(); const address = String(body.address ?? "").trim(); const grams = Number(body.gramsPerPerson);
  if (title.length < 3 || title.length > 100 || !body.eventDate || grams < 200 || grams > 1000) return NextResponse.json({ message: "Revise os dados do churrasco." }, { status: 400 });
  // owner_id vincula o evento ao usuário e sustenta as políticas RLS.
  const base = { owner_id: context.user.id, title, event_date: body.eventDate, grams_per_person: grams };
  let { error } = await context.database.from("events").insert({ ...base, address: address || null });
  // Projetos criados com o primeiro schema ainda podem não expor a coluna address no cache da API.
  if (error?.code === "PGRST204") ({ error } = await context.database.from("events").insert(base));
  if (error) { console.error("event_create_failed", error.code); return NextResponse.json({ message:`Não foi possível criar (${error.code}).` }, { status:500 }); }
  return NextResponse.json({ message: "Churrasco criado." });
}
