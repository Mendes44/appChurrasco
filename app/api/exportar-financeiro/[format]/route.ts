import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function safeName(title: string) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "braza";
}

// Exporta o mesmo rateio apresentado na tela, incluindo pagamentos e observações.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> },
) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const eventId = new URL(request.url).searchParams.get("evento") ?? "";
  const { data: event } = await context.database.from("events").select("id,title").eq("id", eventId).eq("owner_id", context.user.id).maybeSingle();
  if (!event) return NextResponse.json({ message: "Evento não encontrado." }, { status: 404 });

  const [{ data: guestData }, { data: expenseData }] = await Promise.all([
    context.database.from("guests").select("name,party_size,drinkers_count,is_attending,attended,paid_at").eq("event_id", event.id).order("created_at"),
    context.database.from("expenses").select("description,category,amount_cents,notes").eq("event_id", event.id).order("created_at"),
  ]);
  const guests = (guestData ?? []).filter((guest) => guest.attended ?? guest.is_attending);
  const expenses = expenseData ?? [];
  const people = guests.reduce((sum, guest) => sum + guest.party_size, 0);
  const drinkers = guests.reduce((sum, guest) => sum + guest.drinkers_count, 0);
  const generalTotal = expenses.filter((item) => item.category === "general").reduce((sum, item) => sum + item.amount_cents, 0);
  const beerTotal = expenses.filter((item) => item.category === "beer").reduce((sum, item) => sum + item.amount_cents, 0);
  const charges = guests.map((guest) => ({
    ...guest,
    cents: Math.round((people ? generalTotal / people : 0) * guest.party_size + (drinkers ? beerTotal / drinkers : 0) * guest.drinkers_count),
  }));
  const total = generalTotal + beerTotal;
  if (charges.length) {
    const roundedTotal = charges.reduce((sum, guest) => sum + guest.cents, 0);
    charges[charges.length - 1].cents += total - roundedTotal;
  }
  const received = charges.filter((guest) => guest.paid_at).reduce((sum, guest) => sum + guest.cents, 0);
  const { format } = await params;
  const filename = `${safeName(event.title)}-relatorio-financeiro`;

  if (format === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet("Resumo");
    summary.addRows([["BRAZA — Relatório financeiro"], ["Evento", event.title], ["Total gasto", total / 100], ["Recebido", received / 100], ["Pendente", (charges.reduce((sum, guest) => sum + guest.cents, 0) - received) / 100]]);
    summary.getColumn(1).width = 24; summary.getColumn(2).width = 28;
    for (const row of [3, 4, 5]) summary.getCell(`B${row}`).numFmt = 'R$ #,##0.00';
    const payments = workbook.addWorksheet("Pagamentos");
    payments.columns = [{ header:"Convidado", key:"name", width:30 }, { header:"Pessoas", key:"people", width:12 }, { header:"Bebem", key:"drinkers", width:12 }, { header:"Valor", key:"amount", width:16 }, { header:"Status", key:"status", width:16 }];
    payments.addRows(charges.map((guest) => ({ name:guest.name, people:guest.party_size, drinkers:guest.drinkers_count, amount:guest.cents / 100, status:guest.paid_at ? "Pago" : "Pendente" })));
    payments.getColumn("amount").numFmt = 'R$ #,##0.00';
    const costs = workbook.addWorksheet("Despesas");
    costs.columns = [{ header:"Descrição", key:"description", width:32 }, { header:"Tipo", key:"category", width:18 }, { header:"Valor", key:"amount", width:16 }, { header:"Observações", key:"notes", width:45 }];
    costs.addRows(expenses.map((item) => ({ description:item.description, category:item.category === "beer" ? "Cerveja" : "Churrasco", amount:item.amount_cents / 100, notes:item.notes ?? "" })));
    costs.getColumn("amount").numFmt = 'R$ #,##0.00';
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, { headers:{ "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition":`attachment; filename="${filename}.xlsx"`, "Cache-Control":"private, no-store" } });
  }

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF();
    document.setFontSize(19); document.text("BRAZA - Relatorio financeiro", 14, 18);
    document.setFontSize(11); document.text(event.title, 14, 27);
    document.text(`Total gasto: ${money(total)} | Recebido: ${money(received)}`, 14, 37);
    document.setFontSize(9);
    let y = 49;
    document.text("Convidado", 14, y); document.text("Valor", 120, y); document.text("Status", 158, y); y += 7;
    for (const guest of charges) {
      if (y > 280) { document.addPage(); y = 18; }
      document.text(guest.name.slice(0, 48), 14, y); document.text(money(guest.cents), 120, y); document.text(guest.paid_at ? "Pago" : "Pendente", 158, y); y += 7;
    }
    y += 6;
    if (y > 265) { document.addPage(); y = 18; }
    document.setFontSize(12); document.text("Despesas registradas", 14, y); y += 8;
    document.setFontSize(9);
    for (const item of expenses) {
      const note = item.notes ? ` - ${item.notes}` : "";
      const lines = document.splitTextToSize(`${item.description} (${item.category === "beer" ? "Cerveja" : "Churrasco"})${note}`, 135) as string[];
      if (y + lines.length * 5 > 282) { document.addPage(); y = 18; }
      document.text(lines, 14, y); document.text(money(item.amount_cents), 158, y); y += Math.max(7, lines.length * 5 + 2);
    }
    const buffer = document.output("arraybuffer");
    return new Response(buffer, { headers:{ "Content-Type":"application/pdf", "Content-Disposition":`attachment; filename="${filename}.pdf"`, "Cache-Control":"private, no-store" } });
  }

  return NextResponse.json({ message: "Formato inválido." }, { status: 404 });
}
