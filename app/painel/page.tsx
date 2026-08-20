import { isAdmin } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Guest = { id: string; name: string; is_attending: boolean; drinks: boolean; brings_own_drink: boolean };

export default async function DashboardPage() {
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
  const { data: event } = await admin.from("events").select("id, title, event_date, invite_token, grams_per_person").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data } = event ? await admin.from("guests").select("id, name, is_attending, drinks, brings_own_drink").eq("event_id", event.id).order("created_at") : { data: [] };
  const guests = (data ?? []) as Guest[];
  const attending = guests.filter((guest) => guest.is_attending);
  const drinkers = attending.filter((guest) => guest.drinks);
  const meatKg = attending.length * ((event?.grams_per_person ?? 350) / 1000);
  const inviteUrl = event ? `/convite/${event.invite_token}` : null;

  const meats = [{ name: "Bovina", kg: meatKg * .4 }, { name: "Linguiça", kg: meatKg * .25 }, { name: "Frango", kg: meatKg * .2 }, { name: "Suína", kg: meatKg * .15 }];
  return <main><header className="topbar"><Link className="brand" href="/painel"><span className="brand-mark">B</span><span>BRASA</span></Link><nav><a className="active" href="#resumo">Resumo</a><a href="#convidados">Convidados</a><a href="#compras">Compras</a></nav><a className="logout" href="/auth/signout">Sair</a></header>
    <section className="hero" id="resumo"><div><span className="eyebrow">PAINEL PRIVADO</span><h1>{event?.title ?? "Seu churrasco"}</h1><p>Controle de convidados, carnes e bebidas.</p></div>{inviteUrl && <Link className="primary link-button" href={inviteUrl}>Abrir convite</Link>}</section>
    {!event && <section className="empty-card"><h2>Supabase conectado</h2><p>Execute o passo de criação do primeiro evento descrito no README para começar.</p></section>}
    <section className="stats"><article><span className="stat-icon coral">●</span><div><b>{attending.length}</b><span>confirmados</span></div><small>{guests.length - attending.length} não vão</small></article><article><span className="stat-icon orange">◆</span><div><b>{meatKg.toFixed(1)} kg</b><span>de carnes</span></div><small>{event?.grams_per_person ?? 350} g / pessoa</small></article><article><span className="stat-icon green">●</span><div><b>{drinkers.length}</b><span>vão beber</span></div><small>{attending.length - drinkers.length} sem álcool</small></article><article><span className="stat-icon yellow">◷</span><div><b>{(drinkers.length * 1.5).toFixed(1)} L</b><span>de chopp</span></div><small>ou {drinkers.length * 5} latas</small></article></section>
    <section className="content-grid" id="compras"><article className="card meat-card"><div className="card-heading"><div><span className="eyebrow">COMPRAS</span><h2>Distribuição das carnes</h2></div></div><div className="meat-content"><div className="donut" data-total={`${meatKg.toFixed(1)} kg`} /><div className="legend">{meats.map((meat) => <div className="legend-row" key={meat.name}><span className="dot" /><span>{meat.name}</span><b>{meat.kg.toFixed(2)} kg</b></div>)}</div></div></article><article className="card drink-card"><span className="eyebrow">BEBIDAS</span><h2>Estimativa de consumo</h2><div className="drink-feature"><span className="beer">▥</span><div><small>CHOPP</small><b>{(drinkers.length * 1.5).toFixed(1)} L</b><p>1,5 L por pessoa que bebe</p></div></div><div className="drink-options"><div><p><b>{drinkers.length * 5} latas</b>350 ml cada</p></div><div><p><b>{Math.ceil(drinkers.length * 1.7)} garrafas</b>600 ml cada</p></div></div></article></section>
    <section className="card guests-card" id="convidados"><div className="card-heading"><div><span className="eyebrow">RESPOSTAS</span><h2>Lista de convidados</h2></div></div><div className="guest-table"><div className="table-head"><span>Nome</span><span>Presença</span><span>Bebida</span></div>{guests.map((guest) => <div key={guest.id}><b>{guest.name}</b><span>{guest.is_attending ? "Confirmado" : "Não vai"}</span><span>{guest.drinks ? "Vai beber" : guest.brings_own_drink ? "Levará a própria" : "Não bebe"}</span></div>)}{!guests.length && <p className="empty-row">Nenhuma resposta recebida.</p>}</div></section>
  </main>;
}
