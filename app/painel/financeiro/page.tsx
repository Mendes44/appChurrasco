import { AdminHeader } from "@/components/AdminHeader";
import { getAdminContext } from "@/lib/admin";
import { redirect } from "next/navigation";
import { Expense, FinanceGuest, FinanceManager } from "./FinanceManager";

export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  const context = await getAdminContext();
  if (!context) redirect("/login");
  const { evento } = await searchParams;
  let query = context.database
    .from("events")
    .select("id,title,pix_key,pix_holder")
    .eq("owner_id", context.user.id);
  if (evento && /^[0-9a-f-]{36}$/i.test(evento)) query = query.eq("id", evento);
  const { data: event } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: guestData } = event
    ? await context.database
        .from("guests")
        .select("id,name,phone,party_size,drinkers_count,is_attending,attended,paid_at")
        .eq("event_id", event.id)
        .order("created_at")
    : { data: [] };
  const { data: expenseData } = event
    ? await context.database
        .from("expenses")
        .select("id,description,category,amount_cents,receipt_path")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const expenses = await Promise.all(
    (expenseData ?? []).map(async (item) => {
      let receipt_url: string | null = null;
      if (item.receipt_path) {
        const { data } = await context.database.storage
          .from("receipts")
          .createSignedUrl(item.receipt_path, 900);
        receipt_url = data?.signedUrl ?? null;
      }
      return { ...item, receipt_url };
    }),
  );
  return (
    <main>
      <AdminHeader active="financeiro" eventId={event?.id} />
      <section className="page-heading compact-heading">
        <span className="eyebrow">{event?.title ?? "EVENTO"}</span>
        <h1>Financeiro</h1>
        <p>Registre gastos, guarde comprovantes e envie o rateio.</p>
      </section>
      {event ? (
        <FinanceManager
          eventId={event.id}
          eventTitle={event.title}
          pixKey={event.pix_key}
          pixHolder={event.pix_holder}
          expenses={expenses as Expense[]}
          guests={(guestData ?? []) as FinanceGuest[]}
        />
      ) : (
        <section className="empty-card">Crie um evento para começar.</section>
      )}
    </main>
  );
}
