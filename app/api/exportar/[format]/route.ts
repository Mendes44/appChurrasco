import { getAdminContext } from "@/lib/admin";
import { buildShoppingList } from "@/lib/shopping";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function getList(eventId?: string) {
  const context = await getAdminContext();
  if (!context) return null;
  let eventQuery = context.database.from("events").select("id,title,grams_per_person,beer_liters_per_drinker").eq("owner_id", context.user.id);
  if (eventId && /^[0-9a-f-]{36}$/i.test(eventId)) eventQuery = eventQuery.eq("id", eventId);
  const { data: event } = await eventQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!event) return { title: "Braza", items: buildShoppingList(0, 0, 350) };
  const { data } = await context.database.from("guests").select("party_size,drinkers_count,is_attending").eq("event_id", event.id);
  const attending = (data ?? []).filter((guest) => guest.is_attending);
  const people = attending.reduce((total, guest) => total + guest.party_size, 0);
  const drinkers = attending.reduce((total, guest) => total + guest.drinkers_count, 0);
  return { title: event.title, items: buildShoppingList(people, drinkers, event.grams_per_person, Number(event.beer_liters_per_drinker ?? 1.5)) };
}

function safeName(title: string) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "braza";
}

// Os arquivos são gerados no servidor e somente após validar o login do proprietário.
export async function GET(request: Request, { params }: { params: Promise<{ format: string }> }) {
  const url = new URL(request.url);
  const list = await getList(url.searchParams.get("evento") ?? undefined);
  if (!list) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  const { format } = await params;
  const filename = `${safeName(list.title)}-lista-de-compras`;
  const beverage = url.searchParams.get("bebida") ?? "chopp";
  const items = list.items.filter(([name]) => name === "Chopp" ? beverage === "chopp" : name.startsWith("Latas") ? beverage === "latas" : name.startsWith("Garrafas") ? beverage === "garrafas" : true);

  if (format === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Lista de compras");
    sheet.columns = [{ header: "Item", key: "item", width: 34 }, { header: "Quantidade", key: "quantity", width: 24 }, { header: "Comprado", key: "done", width: 14 }];
    sheet.addRows(items.map(([item, quantity]) => ({ item, quantity, done: "" })));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2673A" } };
    sheet.autoFilter = "A1:C1";
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "private, no-store" } });
  }

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF();
    document.setFontSize(20); document.text("BRAZA", 16, 18);
    document.setFontSize(14); document.text(`Lista de compras - ${list.title}`, 16, 29);
    document.setFontSize(10);
    items.forEach(([item, quantity], index) => {
      const y = 42 + index * 11;
      document.rect(16, y - 4, 4, 4); document.text(item, 25, y); document.text(quantity, 140, y);
    });
    const buffer = document.output("arraybuffer");
    return new Response(buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "private, no-store" } });
  }

  return NextResponse.json({ message: "Formato inválido." }, { status: 404 });
}
