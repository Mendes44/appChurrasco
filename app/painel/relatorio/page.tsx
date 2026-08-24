import { AdminHeader } from "@/components/AdminHeader";
import { getAdminContext } from "@/lib/admin";
import { calculateCharges } from "@/lib/finance";
import { buildShoppingList } from "@/lib/shopping";
import { redirect } from "next/navigation";
import { ReportActions } from "./ReportActions";

export const dynamic="force-dynamic";

// Formata centavos no servidor para que a tela e os arquivos usem o mesmo padrão.
const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);

export default async function CompleteReportPage({searchParams}:{searchParams:Promise<{evento?:string}>}){
  // A autenticação acontece antes de qualquer consulta ou montagem do relatório.
  const context=await getAdminContext();
  if(!context)redirect("/login");
  const{evento}=await searchParams;
  let eventQuery=context.database.from("events").select("id,title,event_date,address,grams_per_person,beer_liters_per_drinker,shopping_checked,status").eq("owner_id",context.user.id);
  if(evento&&/^[0-9a-f-]{36}$/i.test(evento))eventQuery=eventQuery.eq("id",evento);
  const{data:event}=await eventQuery.order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!event)return <main><AdminHeader active="relatorio"/><section className="empty-card">Crie um evento para gerar o relatório completo.</section></main>;

  // As consultas independentes são executadas juntas para reduzir o tempo da página.
  const[{data:guests},{data:expenses},{data:customItems}]=await Promise.all([
    context.database.from("guests").select("id,name,companion_name,party_size,drinkers_count,is_attending,attended,paid_at").eq("event_id",event.id).order("name"),
    context.database.from("expenses").select("description,category,amount_cents,included_in_split,expense_group").eq("event_id",event.id).order("created_at"),
    context.database.from("event_shopping_items").select("name,quantity,checked").eq("event_id",event.id).order("created_at"),
  ]);

  // A presença conferida prevalece. Antes da conferência, usamos a confirmação.
  const confirmed=(guests??[]).filter(guest=>guest.is_attending);
  const present=confirmed.filter(guest=>guest.attended??guest.is_attending);
  const confirmedPeople=confirmed.reduce((sum,guest)=>sum+guest.party_size,0);
  const presentPeople=present.reduce((sum,guest)=>sum+guest.party_size,0);
  const absentPeople=confirmed.filter(guest=>guest.attended===false).reduce((sum,guest)=>sum+guest.party_size,0);
  const drinkers=present.reduce((sum,guest)=>sum+guest.drinkers_count,0);
  const generalTotal=(expenses??[]).filter(item=>item.included_in_split&&item.category==="general").reduce((sum,item)=>sum+item.amount_cents,0);
  const beerTotal=(expenses??[]).filter(item=>item.included_in_split&&item.category==="beer").reduce((sum,item)=>sum+item.amount_cents,0);
  const totalSpent=(expenses??[]).reduce((sum,item)=>sum+item.amount_cents,0);
  const{charges}=calculateCharges(present,generalTotal,beerTotal);
  const received=charges.filter(charge=>charge.paid_at).reduce((sum,charge)=>sum+charge.cents,0);
  const splitTotal=charges.reduce((sum,charge)=>sum+charge.cents,0);
  const pending=splitTotal-received;
  // A lista sugerida é recalculada com os parâmetros originais do evento.
  const suggestedShopping=buildShoppingList(confirmedPeople,confirmed.reduce((sum,guest)=>sum+guest.drinkers_count,0),event.grams_per_person,Number(event.beer_liters_per_drinker??1.5));
  const attendanceMax=Math.max(1,confirmedPeople);
  const financeMax=Math.max(1,splitTotal);

  // Esta página também serve como documento de impressão com estilos específicos.
  return <main className="report-page">
    <AdminHeader active="relatorio" eventId={event.id}/>
    <section className="page-heading compact-heading report-heading"><div><span className="eyebrow">RELATÓRIO COMPLETO</span><h1>{event.title}</h1><p>{new Date(event.event_date).toLocaleString("pt-BR",{dateStyle:"long",timeStyle:"short"})}{event.address?` · ${event.address}`:""}</p></div><ReportActions eventId={event.id}/></section>
    <section className="report-kpis">
      <article><small>Confirmados</small><b>{confirmedPeople}</b></article><article><small>Presentes</small><b>{presentPeople}</b></article><article><small>Pessoas que beberam</small><b>{drinkers}</b></article><article><small>Total gasto</small><b>{money(totalSpent)}</b></article>
    </section>
    <section className="report-charts">
      <article className="card"><span className="eyebrow">PRESENÇA</span><h2>Conclusão do evento</h2><div className="report-bars">
        <div><span>Presentes <b>{presentPeople}</b></span><i><em style={{width:`${presentPeople/attendanceMax*100}%`}}/></i></div>
        <div><span>Não compareceram <b>{absentPeople}</b></span><i><em style={{width:`${absentPeople/attendanceMax*100}%`}}/></i></div>
        <div><span>A conferir <b>{Math.max(0,confirmedPeople-presentPeople-absentPeople)}</b></span><i><em style={{width:`${Math.max(0,confirmedPeople-presentPeople-absentPeople)/attendanceMax*100}%`}}/></i></div>
      </div></article>
      <article className="card"><span className="eyebrow">FINANCEIRO</span><h2>Recebimentos</h2><div className="report-bars finance-bars">
        <div><span>Recebido <b>{money(received)}</b></span><i><em style={{width:`${received/financeMax*100}%`}}/></i></div>
        <div><span>Pendente <b>{money(pending)}</b></span><i><em style={{width:`${pending/financeMax*100}%`}}/></i></div>
        <div><span>Fora do rateio <b>{money(totalSpent-generalTotal-beerTotal)}</b></span><i><em style={{width:`${Math.min(100,(totalSpent-generalTotal-beerTotal)/Math.max(1,totalSpent)*100)}%`}}/></i></div>
      </div></article>
    </section>
    <section className="card report-table-card"><span className="eyebrow">CONVIDADOS</span><h2>Presença e pagamentos</h2><div className="report-table"><div><b>Nome</b><b>Pessoas</b><b>Presença</b><b>Pagamento</b></div>{charges.map(charge=><div key={charge.id}><span>{charge.name}</span><span>{charge.party_size}</span><span>{charge.attended===false?"Não compareceu":charge.attended===true?"Compareceu":"A conferir"}</span><span>{charge.paid_at?`Pago · ${money(charge.cents)}`:`Pendente · ${money(charge.cents)}`}</span></div>)}</div></section>
    <section className="report-columns">
      <article className="card"><span className="eyebrow">DESPESAS</span><h2>Valores registrados</h2>{(expenses??[]).map((item,index)=><p className="report-line" key={`${item.description}${index}`}><span>{item.description}<small>{item.included_in_split?"Incluída no rateio":"Despesa própria"}</small></span><b>{money(item.amount_cents)}</b></p>)}{!expenses?.length&&<p>Nenhuma despesa registrada.</p>}</article>
      <article className="card"><span className="eyebrow">COMPRAS</span><h2>Lista sugerida e extras</h2>{suggestedShopping.map(([name,quantity])=><p className="report-line" key={name}><span>{name}<small>{event.shopping_checked?.includes(name)?"Comprado":"Pendente"}</small></span><b>{quantity}</b></p>)}{(customItems??[]).map((item,index)=><p className="report-line" key={`${item.name}${index}`}><span>{item.name}<small>{item.checked?"Comprado":"Pendente"}</small></span><b>{item.quantity}</b></p>)}</article>
    </section>
  </main>;
}
