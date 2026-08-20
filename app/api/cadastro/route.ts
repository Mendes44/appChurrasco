import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json(); const token = String(body.token ?? ""); const name = String(body.name ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(token) || name.length < 2 || name.length > 80) return NextResponse.json({ message: "Revise os dados." }, { status: 400 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"; const key = createHash("sha256").update(`${ip}|${token}|${new Date().toISOString().slice(0,13)}`).digest("hex");
  const { data: allowed } = await admin.rpc("allow_confirmation", { p_key: key }); if (!allowed) return NextResponse.json({ message: "Muitas tentativas. Aguarde uma hora." }, { status: 429 });
  const { error } = await admin.rpc("submit_general_registration", { p_event_token: token, p_name: name, p_attending: Boolean(body.attending), p_companion_name: body.companionName || null, p_primary_drinks: Boolean(body.primaryDrinks), p_companion_drinks: Boolean(body.companionDrinks), p_brings_own_drink: Boolean(body.bringsOwnDrink) });
  if (error?.message.includes("already_registered")) return NextResponse.json({ message: "Esse nome já está cadastrado." }, { status: 409 });
  if (error) return NextResponse.json({ message: "Não foi possível cadastrar." }, { status: 400 });
  return NextResponse.json({ message: "Cadastro realizado. Obrigado!" });
}
