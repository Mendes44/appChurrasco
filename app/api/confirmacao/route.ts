import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

type Confirmation = { token?: unknown; phone?: unknown; attending?: unknown; companionName?: unknown; primaryDrinks?: unknown; companionDrinks?: unknown; bringsOwnDrink?: unknown };

// Esta rota mantém a chave administrativa fora do navegador e valida todo o conteúdo.
export async function POST(request: Request) {
  try {
    const body = await request.json() as Confirmation;
    const companionName = typeof body.companionName === "string" ? body.companionName.trim().replace(/\s+/g, " ") : "";
    const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    if (typeof body.token !== "string" || !/^[0-9a-f-]{36}$/i.test(body.token) || phone.length < 10 || phone.length > 13 || companionName.length > 80 || typeof body.attending !== "boolean" || typeof body.primaryDrinks !== "boolean" || typeof body.companionDrinks !== "boolean" || typeof body.bringsOwnDrink !== "boolean") {
      return NextResponse.json({ message: "Confira os dados e tente novamente." }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ message: "As confirmações ainda não foram ativadas." }, { status: 503 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const hour = new Date().toISOString().slice(0, 13);
    const requestKey = createHash("sha256").update(`${ip}|${body.token}|${hour}`).digest("hex");
    const { data: allowed } = await supabase.rpc("allow_confirmation", { p_key: requestKey });
    if (!allowed) return NextResponse.json({ message: "Muitas tentativas. Aguarde um pouco e tente novamente." }, { status: 429 });
    const { data: invitation } = await supabase.from("invitations").select("revoked_at, responded_at, event_id").eq("token", body.token).maybeSingle();
    if (!invitation || invitation.revoked_at) return NextResponse.json({ message: "Este convite foi cancelado." }, { status: 404 });
    if (invitation.responded_at) return NextResponse.json({ message: "Este convite já foi respondido." }, { status: 409 });
    const { data: event } = await supabase.from("events").select("status").eq("id", invitation.event_id).maybeSingle();
    if (!event || event.status === "closed") return NextResponse.json({ message:"Este evento já foi encerrado." }, { status:410 });
    const { error } = await supabase.rpc("submit_personal_invitation", {
      p_token: body.token,
      p_attending: body.attending,
      p_companion_name: companionName || null,
      p_primary_drinks: body.attending && body.primaryDrinks,
      p_companion_drinks: body.attending && Boolean(companionName) && body.companionDrinks,
      p_brings_own_drink: body.attending && body.bringsOwnDrink,
      p_phone: phone,
    });
    if (error?.message.includes("already_answered")) return NextResponse.json({ message: "Este convite já foi respondido." }, { status: 409 });
    if (error?.message.includes("invalid_invitation")) return NextResponse.json({ message: "Este convite não é válido." }, { status: 404 });
    if (error) throw error;
    return NextResponse.json({ message: "Resposta registrada. Obrigado!" });
  } catch {
    return NextResponse.json({ message: "Não foi possível registrar agora. Tente novamente." }, { status: 500 });
  }
}
