import { AdminHeader } from "@/components/AdminHeader";
import { getAdminContext } from "@/lib/admin";
import { redirect } from "next/navigation";
import { EventManager } from "./EventManager";

export const dynamic = "force-dynamic";

const auditLabels:Record<string,string>={
  attendance_updated:"Presença do convidado atualizada",
  shopping_item_deleted:"Item removido da lista de compras",
  shopping_item_created:"Item adicionado à lista de compras",
  payment_confirmed:"Pagamento confirmado",
  payment_reopened:"Pagamento marcado como pendente",
  event_closed:"Evento encerrado",
  event_reopened:"Evento reaberto",
  expense_created:"Despesa registrada",
  expense_deleted:"Despesa excluída",
};

export default async function EventsPage() {
  // Compatibilidade temporária para projetos cujo cache ainda não conhece address.
  const context = await getAdminContext();
  if (!context) redirect("/login");
  let { data, error } = await context.database
    .from("events")
    .select("id,title,event_date,address,grams_per_person,beer_liters_per_drinker,invite_token,pix_key,pix_holder,status,rsvp_deadline")
    .eq("owner_id", context.user.id)
    .order("event_date", { ascending: false });
  if (error?.code === "PGRST204") {
    const fallback = await context.database
      .from("events")
      .select("id,title,event_date,grams_per_person,invite_token")
      .eq("owner_id", context.user.id)
      .order("event_date", { ascending: false });
    data = (fallback.data ?? []).map((event) => ({ ...event, 
      address: null, 
      pix_key: null,
      pix_holder: null,
      beer_liters_per_drinker: 1.5,
      status: "active" as const,
      rsvp_deadline: null,
    }));
    error = fallback.error;
  }
  if (error) console.error("events_list_failed", error.code);
  const metrics=Object.fromEntries(await Promise.all((data??[]).map(async event=>{
    const[{data:guests},{data:expenses}]=await Promise.all([
      context.database.from("guests").select("party_size,is_attending,attended").eq("event_id",event.id),
      context.database.from("expenses").select("amount_cents").eq("event_id",event.id),
    ]);
    return[event.id,{confirmed:(guests??[]).filter(g=>g.is_attending).reduce((sum,g)=>sum+g.party_size,0),attended:(guests??[]).filter(g=>g.attended===true).reduce((sum,g)=>sum+g.party_size,0),spent:(expenses??[]).reduce((sum,e)=>sum+e.amount_cents,0)}];
  })));
  const eventNames=Object.fromEntries((data??[]).map(event=>[event.id,event.title]));
  const {data:audit}=(data??[]).length?await context.database.from("audit_logs").select("id,event_id,action,details,created_at").in("event_id",(data??[]).map(event=>event.id)).order("created_at",{ascending:false}).limit(30):{data:[]};
  return (
    <main>
      <AdminHeader active="eventos" />
      <section className="page-heading compact-heading">
        <span className="eyebrow">ADMINISTRAÇÃO</span>
        <h1>Seus churrascos</h1>
        <p>Escolha um evento ou crie um novo.</p>
      </section>
      <EventManager events={data ?? []} metrics={metrics} />
      <section className="card audit-card"><span className="eyebrow">HISTÓRICO E AUDITORIA</span><h2>Últimas alterações</h2><p className="section-description">Acompanhe as ações importantes realizadas em cada churrasco.</p><div className="audit-list">{(audit??[]).map(item=><article key={item.id}><span><b>{auditLabels[item.action]??item.action.replaceAll("_"," ")}</b><small>{eventNames[item.event_id]??"Evento"}</small></span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</time></article>)}{!audit?.length&&<p className="empty-row">As próximas alterações importantes aparecerão aqui.</p>}</div></section>
    </main>
  );
}
