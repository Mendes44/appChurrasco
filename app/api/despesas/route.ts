import { getAdminContext } from "@/lib/admin";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

// Recebe a despesa e mantém o comprovante em um bucket privado do Supabase.
export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const form = await request.formData();
  const eventId = String(form.get("eventId") ?? "");
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const amountCents = Math.round(Number(form.get("amount")) * 100);
  const receipt = form.get("receipt");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || description.length < 2 || description.length > 120 || !["general","beer"].includes(category) || !Number.isSafeInteger(amountCents) || amountCents <= 0) return NextResponse.json({ message:"Revise os dados da despesa." }, { status:400 });
  const { data: ownedEvent } = await context.database.from("events").select("id").eq("id", eventId).eq("owner_id", context.user.id).maybeSingle();
  if (!ownedEvent) return NextResponse.json({ message:"Evento não encontrado." }, { status:404 });

  let receiptPath: string|null = null;
  if (receipt instanceof File && receipt.size > 0) {
    if (!allowedTypes.has(receipt.type) || receipt.size > 2 * 1024 * 1024) return NextResponse.json({ message:"Use uma imagem JPG, PNG ou WebP de até 2 MB." }, { status:400 });
    const extension = receipt.type === "image/png" ? "png" : receipt.type === "image/webp" ? "webp" : "jpg";
    receiptPath = `${context.user.id}/${eventId}/${randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await receipt.arrayBuffer());
    const { error: uploadError } = await context.database.storage.from("receipts").upload(receiptPath, bytes, { contentType:receipt.type, upsert:false });
    if (uploadError) return NextResponse.json({ message:"Não foi possível armazenar o comprovante." }, { status:500 });
  }
  const { error } = await context.database.from("expenses").insert({ event_id:eventId, description, category, amount_cents:amountCents, receipt_path:receiptPath });
  if (error) {
    if (receiptPath) await context.database.storage.from("receipts").remove([receiptPath]);
    console.error("expense_create_failed", error.code);
    return NextResponse.json({ message:`Não foi possível salvar a despesa (${error.code}).` }, { status:500 });
  }
  return NextResponse.json({ message:"Despesa adicionada." });
}
