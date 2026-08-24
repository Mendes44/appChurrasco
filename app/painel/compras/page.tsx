import { AdminHeader } from "@/components/AdminHeader";
import { getAdminContext } from "@/lib/admin";
import { buildShoppingList } from "@/lib/shopping";
import { redirect } from "next/navigation";
import { ShoppingChecklist } from "./ShoppingChecklist";
import { PurchaseReceiptForm } from "./PurchaseReceiptForm";

export const dynamic = "force-dynamic";

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  // O parâmetro evento mantém compras e convidados sincronizados com o painel escolhido.
  const context = await getAdminContext();
  if (!context) redirect("/login");
  const { evento } = await searchParams;
  let eventQuery = context.database.from("events").select("id,title,grams_per_person,beer_liters_per_drinker,shopping_checked").eq("owner_id", context.user.id);
  if (evento && /^[0-9a-f-]{36}$/i.test(evento)) eventQuery = eventQuery.eq("id", evento);
  const { data: events } = await eventQuery.order("created_at", { ascending: false }).limit(1);
  const event = events?.[0];
  const { data } = event ? await context.database.from("guests").select("party_size,drinkers_count,is_attending").eq("event_id", event.id) : { data: [] };
  const attending = (data ?? []).filter((guest) => guest.is_attending);
  const people = attending.reduce((total, guest) => total + guest.party_size, 0);
  const drinkers = attending.reduce((total, guest) => total + guest.drinkers_count, 0);
  const list = buildShoppingList(people, drinkers, event?.grams_per_person ?? 350, Number(event?.beer_liters_per_drinker ?? 1.5));
  const {data:expenseData}=event?await context.database.from("expenses").select("id,description,amount_cents,receipt_path").eq("event_id",event.id).not("receipt_path","is",null).order("created_at",{ascending:false}):{data:[]};
  const receipts=await Promise.all((expenseData??[]).map(async item=>{const{data:signed}=await context.database.storage.from("receipts").createSignedUrl(item.receipt_path!,900);return{id:item.id,description:item.description,amount_cents:item.amount_cents,receipt_url:signed?.signedUrl??""};}));
  return <main><AdminHeader active="compras" eventId={event?.id}/><section className="page-heading"><span className="eyebrow">{people} PESSOAS</span><h1>Lista de compras</h1><p>Quantidades sugeridas para {event?.title ?? "seu churrasco"}.</p></section><ShoppingChecklist eventId={event?.id ?? "sem-evento"} items={list} initialPurchased={event?.shopping_checked ?? []}/>{event&&<PurchaseReceiptForm eventId={event.id} receipts={receipts.filter(item=>item.receipt_url)}/>}<p className="shopping-note">Escolha chopp, latas ou garrafas acima. As marcações são salvas no evento.</p></main>;
}
