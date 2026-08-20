import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

type Confirmation = { token?: unknown; name?: unknown; attending?: unknown; drinks?: unknown; bringsOwnDrink?: unknown };

// Esta rota mantém a chave administrativa fora do navegador e valida todo o conteúdo.
export async function POST(request: Request) {
  try {
    const body = await request.json() as Confirmation;
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (typeof body.token !== "string" || !/^[0-9a-f-]{36}$/i.test(body.token) || name.length < 2 || name.length > 80 || typeof body.attending !== "boolean" || typeof body.drinks !== "boolean" || typeof body.bringsOwnDrink !== "boolean") {
      return NextResponse.json({ message: "Confira os dados e tente novamente." }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ message: "As confirmações ainda não foram ativadas." }, { status: 503 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const hour = new Date().toISOString().slice(0, 13);
    const requestKey = createHash("sha256").update(`${ip}|${body.token}|${hour}`).digest("hex");
    const { data: allowed } = await supabase.rpc("allow_confirmation", { p_key: requestKey });
    if (!allowed) return NextResponse.json({ message: "Muitas tentativas. Aguarde um pouco e tente novamente." }, { status: 429 });
    const { data: event } = await supabase.from("events").select("id").eq("invite_token", body.token).single();
    if (!event) return NextResponse.json({ message: "Este convite não é válido." }, { status: 404 });

    const { error } = await supabase.from("guests").insert({ event_id: event.id, name, is_attending: body.attending, drinks: body.attending && body.drinks, brings_own_drink: body.attending && !body.drinks && body.bringsOwnDrink });
    if (error?.code === "23505") return NextResponse.json({ message: "Esse nome já respondeu ao convite." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ message: "Resposta registrada. Obrigado!" });
  } catch {
    return NextResponse.json({ message: "Não foi possível registrar agora. Tente novamente." }, { status: 500 });
  }
}
