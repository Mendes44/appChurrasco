import { isAdmin } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { InviteManager } from "./InviteManager";
import { AdminHeader } from "@/components/AdminHeader";
import { DrinkEstimate } from "./DrinkEstimate";

export const dynamic = "force-dynamic";

type Guest = { id: string; name: string; companion_name: string | null; party_size: number; is_attending: boolean; drinkers_count: number; brings_own_drink: boolean };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  // Server Component: dados sensíveis são consultados antes de enviar o HTML.
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/acesso-negado");

  // A chave privada só é criada depois da autenticação e da autorização por e-mail.
  // Ela nunca é enviada ao navegador e evita depender dos dados do token na consulta.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { evento } = await searchParams;
  let eventQuery = admin.from("events").select("id, title, event_date, invite_token, grams_per_person").eq("owner_id", user.id);
  if (evento && /^[0-9a-f-]{36}$/i.test(evento)) eventQuery = eventQuery.eq("id", evento);
  const { data: event } = await eventQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data } = event ? await admin.from("guests").select("id, name, companion_name, party_size, is_attending, drinkers_count, brings_own_drink").eq("event_id", event.id).order("created_at") : { data: [] };
  const { data: invitationData } = event ? await admin.from("invitations").select("id, guest_name, token, responded_at").eq("event_id", event.id).order("created_at", { ascending: false }) : { data: [] };
  const guests = (data ?? []) as Guest[];
  // Cálculos consideram apenas quem confirmou presença.
  const attending = guests.filter((guest) => guest.is_attending);
  const peopleCount = attending.reduce((total, guest) => total + (guest.party_size || 1), 0);
  const drinkersCount = attending.reduce((total, guest) => total + (guest.drinkers_count ?? 0), 0);
  const meatKg = peopleCount * ((event?.grams_per_person ?? 350) / 1000);

  const meats = [{ name: "Bovina", kg: meatKg * .4 }, { name: "Linguiça", kg: meatKg * .25 }, { name: "Frango", kg: meatKg * .2 }, { name: "Suína", kg: meatKg * .15 }];
  return <main><AdminHeader active="resumo" eventId={event?.id} />
    <section className="hero" id="resumo"><div><span className="eyebrow">PAINEL PRIVADO</span><h1>{event?.title ?? "Seu churrasco"}</h1><p>Controle de convidados, carnes e bebidas.</p></div></section>
    {!event && <section className="empty-card"><h2>Supabase conectado</h2><p>Execute o passo de criação do primeiro evento descrito no README para começar.</p></section>}
    <section className="stats"><article><span className="stat-icon coral">●</span><div><b>{peopleCount}</b><span>pessoas confirmadas</span></div><small>{guests.length - attending.length} convites recusados</small></article><article><span className="stat-icon orange">◆</span><div><b>{meatKg.toFixed(2)} kg</b><span>de carnes</span></div><small>{event?.grams_per_person ?? 350} g / pessoa</small></article><article><span className="stat-icon green">●</span><div><b>{drinkersCount}</b><span>vão beber</span></div><small>{peopleCount - drinkersCount} sem álcool</small></article><article><span className="stat-icon yellow">◷</span><div><b>{(drinkersCount * 1.5).toFixed(1)} L</b><span>de chopp</span></div><small>ou {drinkersCount * 5} latas</small></article></section>
    {event && <InviteManager eventId={event.id} invitations={invitationData ?? []} />}
    <section className="content-grid" id="compras"><article className="card meat-card"><div className="card-heading"><div><span className="eyebrow">COMPRAS</span><h2>Distribuição das carnes</h2></div></div><div className="meat-content"><div className="donut" data-total={`${meatKg.toFixed(2)} kg`} /><div className="legend">{meats.map((meat) => <div className="legend-row" key={meat.name}><span className="dot" /><span>{meat.name}</span><b>{meat.kg.toFixed(2)} kg</b></div>)}</div></div></article><article className="card drink-card"><span className="eyebrow">BEBIDAS</span><h2>Estimativa sugerida</h2><DrinkEstimate drinkers={drinkersCount} people={peopleCount}/></article></section>
    <section className="card guests-card" id="convidados"><div className="card-heading"><div><span className="eyebrow">RESPOSTAS</span><h2>Lista de convidados</h2></div><Link className="primary link-button" href="/painel/convidados">Gerenciar</Link></div><div className="guest-table"><div className="table-head"><span>Nome</span><span>Pessoas</span><span>Bebida</span></div>{guests.map((guest) => <div key={guest.id}><b>{guest.name}{guest.companion_name ? ` + ${guest.companion_name}` : ""}</b><span>{guest.is_attending ? guest.party_size : "Não vai"}</span><span>{guest.is_attending ? `${guest.drinkers_count} bebem` : "—"}{guest.brings_own_drink ? " · bebida própria" : ""}</span></div>)}{!guests.length && <p className="empty-row">Nenhuma resposta recebida.</p>}</div></section>
  </main>;
}
