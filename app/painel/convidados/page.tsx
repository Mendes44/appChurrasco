import { AdminHeader } from "@/components/AdminHeader";
import { getAdminContext } from "@/lib/admin";
import { redirect } from "next/navigation";
import { GuestEditor } from "./GuestEditor";

export const dynamic = "force-dynamic";

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  // A consulta sempre inclui owner_id para isolar os dados de cada organizador.
  const context = await getAdminContext(); if (!context) redirect("/login");
  const { evento } = await searchParams;
  let eventQuery = context.database.from("events").select("id,title").eq("owner_id", context.user.id);
  if (evento && /^[0-9a-f-]{36}$/i.test(evento)) eventQuery = eventQuery.eq("id", evento);
  const { data: events } = await eventQuery.order("created_at", { ascending:false }).limit(1);
  const event = events?.[0];
  const { data } = event ? await context.database.from("guests").select("id,name,companion_name,party_size,drinkers_count,brings_own_drink").eq("event_id", event.id).order("created_at") : { data:[] };
  return <main><AdminHeader active="convidados" eventId={event?.id}/><section className="page-heading"><span className="eyebrow">{event?.title??"EVENTO"}</span><h1>Convidados</h1><p>Corrija respostas quando alguém mudar de planos.</p></section><GuestEditor guests={data??[]}/></main>;
}
