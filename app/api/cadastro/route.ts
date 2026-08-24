import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

// Cadastro pelo link compartilhável: valida o token, limita abuso por IP e
// delega a gravação à função SQL para manter a regra atômica no banco.

export async function POST(request: Request) {
  // Dados públicos nunca são confiáveis; normalize e valide antes do Supabase.
  const body = await request.json(); const token = String(body.token ?? ""); const name = String(body.name ?? "").trim(); const phone = String(body.phone ?? "").replace(/\D/g, ""); const attending=Boolean(body.attending);
  if (!/^[0-9a-f-]{36}$/i.test(token) || name.length < 2 || name.length > 80 || (attending&&(phone.length < 10 || phone.length > 13))) return NextResponse.json({ message: "Revise os dados." }, { status: 400 });
  // A service role fica apenas nesta rota de servidor e nunca é enviada à tela.
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data:event } = await admin.from("events").select("status,rsvp_deadline").eq("invite_token",token).maybeSingle();
  if(!event||event.status!=="active")return NextResponse.json({message:"Este evento não está recebendo respostas."},{status:410});
  if(event.rsvp_deadline&&new Date(event.rsvp_deadline)<new Date())return NextResponse.json({message:"O prazo para confirmação terminou."},{status:410});
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"; const key = createHash("sha256").update(`${ip}|${token}|${new Date().toISOString().slice(0,13)}`).digest("hex");
  const { data: allowed } = await admin.rpc("allow_confirmation", { p_key: key }); if (!allowed) return NextResponse.json({ message: "Muitas tentativas. Aguarde uma hora." }, { status: 429 });
  const { error } = await admin.rpc("submit_general_registration", { p_event_token: token, p_name: name, p_attending: attending, p_companion_name: attending?(body.companionName || null):null, p_primary_drinks: attending&&Boolean(body.primaryDrinks), p_companion_drinks: attending&&Boolean(body.companionDrinks), p_brings_own_drink: attending&&Boolean(body.bringsOwnDrink), p_phone: attending?phone:null });
  if (error?.message.includes("already_registered")) return NextResponse.json({ message: "Esse nome já está cadastrado." }, { status: 409 });
  if (error) return NextResponse.json({ message: "Não foi possível cadastrar." }, { status: 400 });
  return NextResponse.json({ message: "Cadastro realizado. Obrigado!" });
}
