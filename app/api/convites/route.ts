import { isAdmin } from "@/lib/auth";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";

// Apenas o organizador autenticado consegue gerar links individuais.
export async function POST(request: Request) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ message: "Acesso não autorizado." }, { status: 403 });

  const body = await request.json() as { eventId?: unknown; guestName?: unknown };
  const guestName = typeof body.guestName === "string" ? body.guestName.trim().replace(/\s+/g, " ") : "";
  if (typeof body.eventId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.eventId) || guestName.length < 2 || guestName.length > 80) {
    return NextResponse.json({ message: "Informe um nome válido." }, { status: 400 });
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: event } = await admin.from("events").select("id").eq("id", body.eventId).eq("owner_id", user.id).maybeSingle();
  if (!event) return NextResponse.json({ message: "Evento não encontrado." }, { status: 404 });

  const { data, error } = await admin.from("invitations").insert({ event_id: event.id, guest_name: guestName }).select("token, guest_name").single();
  if (error?.code === "23505") {
    const { data: existing } = await admin.from("invitations").select("token,guest_name").eq("event_id", event.id).ilike("guest_name", guestName).maybeSingle();
    if (existing) return NextResponse.json({ message:"Esse convite já existia. O link está pronto para copiar.", invitation:{ name:existing.guest_name, path:`/convite/${existing.token}` } });
    return NextResponse.json({ message: "Já existe um convite para esse nome." }, { status: 409 });
  }
  if (error) return NextResponse.json({ message: "Não foi possível criar o convite." }, { status: 500 });
  return NextResponse.json({ message: "Convite criado.", invitation: { name: data.guest_name, path: `/convite/${data.token}` } });
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ message: "Acesso não autorizado." }, { status: 403 });
  const body = await request.json() as { id?: string; action?: string };
  const invitationId = String(body.id ?? "");
  if (body.action === "cancel") {
    const { error } = await context.database.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", invitationId).is("responded_at", null);
    return error ? NextResponse.json({ message: "Não foi possível cancelar." }, { status: 500 }) : NextResponse.json({ message: "Convite cancelado." });
  }
  if (body.action === "reissue") {
    const { data, error } = await context.database.from("invitations").update({ token: crypto.randomUUID(), revoked_at: null }).eq("id", invitationId).is("responded_at", null).select("token").single();
    return error ? NextResponse.json({ message: "Não foi possível gerar outro link." }, { status: 500 }) : NextResponse.json({ message: "Novo link criado.", path: `/convite/${data.token}` });
  }
  return NextResponse.json({ message: "Ação inválida." }, { status: 400 });
}
